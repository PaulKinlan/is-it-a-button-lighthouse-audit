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
    const decodedImage = tf.node.decodePng(image, 3);
    const tensor = tf.image.resizeBilinear(decodedImage, [256, 256]);

    // Normalize the image
    const offset = tf.scalar(255.0);
    const normalized = tensor.div(offset);
    //We add a dimension to get a batch shape
    const batched = normalized.expandDims(0);

    return batched;
  });

  const predTensor = model.predict(normalizedData);

  //console.log(predTensor.print());
  const predSoftmax = predTensor.softmax();
  const data = await predSoftmax.data();

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
      description: "Links should like links and buttons should look like buttons",
      requiredArtifacts: ["AnchorElements", "FullPageScreenshot"],
    };
  }

  static async audit(artifacts) {
    const anchorElements = artifacts.AnchorElements;
    const fullPageScreenshot = artifacts.FullPageScreenshot;

    const data = fullPageScreenshot.screenshot.data.replace(
      /^data:image\/jpeg;base64,/,
      ""
    );

    const screenshot = sharp(Buffer.from(data, "base64"));
    const metadata = await screenshot.metadata();
    const newModel = await tf.loadLayersModel("file://./model/model.json");

    const buttonsOnPage = [];

    for (const anchorElement of anchorElements) {
      const { left, top, width, height } = anchorElement.node.boundingRect;
      const newScreenshot = screenshot.clone().extract({
        left: Math.max(left - 10, 0),
        top: Math.max(top - 10, 0),
        width: Math.min(width + 20, metadata.width),
        height: Math.min(height + 20, metadata.height),
      });

      try {
        const image = await newScreenshot.clone().png().toBuffer();
        const { classname, score } = await testImage(newModel, image);
        if (classname === "Button") {
          await newScreenshot.clone().png().toFile(`${anchorElement.node.lhId}-button.png`);
          console.log(anchorElement, classname, score)
          buttonsOnPage.push(anchorElement);
        }
      } catch (error) {
        console.error(error, left, top, width, height);
        continue;
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
        node: Audit.makeNodeItem(button.node),
        suggestion: "People might confuse this link with a button. Consider changing the style of the link to make it look like a link.",
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
