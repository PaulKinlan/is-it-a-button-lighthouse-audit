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

  console.log(predTensor.print());
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
      id: "anchor-looks-like-a-button-audit",
      title: "Anchor element looks like a button",
      failureTitle: "Anchor element looks like a button ",
      description: "Used ",

      // The name of the custom gatherer class that provides input to this audit.
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

    for (const anchorElement of anchorElements) {
      const { left, top, width, height } = anchorElement.node.boundingRect;
      const newScreenshot = screenshot
        .clone()
        .extract({
          left: Math.max(left - 10, 0),
          top: Math.max(top - 10, 0),
          width: Math.min(width + 20, metadata.width),
          height: Math.min(height + 20, metadata.height),
        });

      const image = await newScreenshot.png().toBuffer()

      const { classname, score } = await testImage(newModel, image);
      console.log(classname, score)
    }

    return {
      score: 1,
    };
  }
}

module.exports = AnchorLooksLikeAButtonAudit;
