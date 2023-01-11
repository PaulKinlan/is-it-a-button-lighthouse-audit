const Audit = require("lighthouse").Audit;
const tf = require("@tensorflow/tfjs-node");
const sharp = require("sharp");

/**
 * @fileoverview Tests that `window.myLoadMetrics.searchableTime` was below the
 * test threshold value.
 */

async function testImage(model, image) {
  const normalizedData = tf.tidy(() => {
    //convert the image data to a tensor
    const decodedImage = tf.node.decodePng(image, 1);
    const tensor = tf.image.resizeBilinear(decodedImage, [256, 256]);

    // Normalize the image
    const offset = tf.scalar(255.0);
    const normalized = tensor.div(offset);
    //We add a dimension to get a batch shape
    const batched = normalized.expandDims(0);

    return batched;
  });

  const predTensor = model.predict(normalizedData);

  const predSoftmax = predTensor.softmax();
  const data = await predSoftmax.data();

  //console.log(predSoftmax.print(), data)

  const max = Math.max(...data);
  const maxIdx = data.indexOf(max);

  const classes = {
    0: "Button",
    1: "Text Link",
  };

  return { classname: classes[maxIdx], score: max };
}

class AnchorLooksLikeAButtonAudit extends Audit {
  static get meta() {
    return {
      id: "anchor-looks-like-a-button",
      title: "Anchor element looks like links",
      failureTitle: "Anchor element looks like a button",
      description:
        "Links should like links and buttons should look like buttons",
      requiredArtifacts: [
        "AnchorElements",
        "NonOccludedAnchorElements",
        "BigScreenshot",
      ],
    };
  }

  static async audit(artifacts, context) {
    // We need this because I need a high quality screenshot
    const fullPageScreenshot = artifacts.BigScreenshot; 
    // A list of anchor elements that don't have anything in from of them.
    const nonOccludedAnchorElement = artifacts.NonOccludedAnchorElements;
    // A list of anchor elements that I use to get image in the results.
    const anchorElements = artifacts.AnchorElements;

    //invert anchorElements to devtoolsPathNode
    const anchorMap = {};
    for(const anchorElement of anchorElements) {
      anchorMap[anchorElement.node.devtoolsNodePath] = anchorElement.node;
    }
    
    const devicePixelRatio = 2;//fullPageScreenshot.devicePixelRatio;
    const data = fullPageScreenshot.screenshot.replace(
      /^data:image\/(jpeg|png);base64,/,
      ""
    );

    const screenshot = sharp(Buffer.from(data, "base64"));
    screenshot.clone().toFile("./images/screenshot.png");
    const metadata = await screenshot.metadata();
    const newModel = await tf.loadLayersModel("file://./model/model.json");

    const buttonsOnPage = [];

    for (const anchorElement of nonOccludedAnchorElement) {
      const { left, top, width, height } = anchorElement.node.newBoundingRect;
     
      const newScreenshot = screenshot.clone().extract({
        left: Math.floor(Math.max(left * devicePixelRatio, 0)),
        top: Math.floor(Math.max(top * devicePixelRatio,0)),
        width: Math.floor(Math.min(width * devicePixelRatio, metadata.width)),
        height: Math.floor(Math.min(height * devicePixelRatio, metadata.height)),
      });
      try {
        const image = await newScreenshot.clone().png().toBuffer();
        const { classname, score } = await testImage(newModel, image);
        // console.log(classname, score, anchorElement.node.lhId);
        await newScreenshot
          .clone()
          .png()
          .toFile(`./images/${anchorElement.node.lhId}-${classname}.png`);

        if (classname === "Button") {
          buttonsOnPage.push(anchorElement);
        }
      } catch (error) {
        console.error(error, left, top, width, height);
      }
    }

    const headings = [
      {
        key: "node",
        itemType: "node",
        text: "Failing Elements",
      },
      {
        key: "suggestion",
        itemType: "text",
        text: "Suggestion",
      },
    ];

    const failingFormsData = buttonsOnPage.map((button) => {
      return {
        // Use this node to find the visual of the element that will be displayed in the report. (it's a hack)
        node: Audit.makeNodeItem(anchorMap[button.node.devtoolsNodePath]),
        suggestion:
          "People might confuse this link with a button. Consider changing the style of the link to make it look like a link.",
      };
    });

    const details = Audit.makeTableDetails(headings, failingFormsData);

    return {
      score: buttonsOnPage.length > 0 ? 0 : 1,
      displayValue: `Found ${buttonsOnPage.length} anchors that look like buttons`,
      details,
    };
  }
}

module.exports = AnchorLooksLikeAButtonAudit;
