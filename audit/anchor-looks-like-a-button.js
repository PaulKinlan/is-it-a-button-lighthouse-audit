const Audit = require("lighthouse").Audit;
const sharp = require("sharp");

/**
 * @fileoverview Tests that `window.myLoadMetrics.searchableTime` was below the
 * test threshold value.
 */

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
    console.log(metadata);

    for (const anchorElement of anchorElements) {
      const { left, top, width, height } = anchorElement.node.boundingRect;
      const newScreenshot = screenshot
        .clone().extract(
          { left: Math.max(left - 10, 0), 
            top: Math.max(top - 10, 0), 
            width: Math.min(width + 20, metadata.width) ,
            height: Math.min(height + 20, metadata.height) 
          });

      newScreenshot.toFile(`images/site-${anchorElement.node.lhId}.png`, (err, info) => {
        if (err) {
          console.log(err);
        }
      });
        
    }

    return {
      score: 1,
    };
  }
}

module.exports = AnchorLooksLikeAButtonAudit;
