const Audit = require('lighthouse').Audit;
const sharp = require('sharp');


/**
 * @fileoverview Tests that `window.myLoadMetrics.searchableTime` was below the
 * test threshold value.
 */

class LoadAudit extends Audit {
  static get meta() {
    return {
      id: 'anchor-looks-like-a-button-audit',
      title: 'Anchor element looks like a button',
      failureTitle: 'Anchor element looks like a button ',
      description: 'Used ',

      // The name of the custom gatherer class that provides input to this audit.
      requiredArtifacts: ['AnchorElements', 'FullPageScreenshot'],
    };
  }

  static audit(artifacts) {
    const anchorElements = artifacts.AnchorElements;
    const fullPageScreenshot = artifacts.FullPageScreenshot;

    const data = fullPageScreenshot.screenshot.data.replace(/^data:image\/png;base64,/, "");

    console.log(data)

    const screenshot = sharp(Buffer.from(fullPageScreenshot.screenshot.data, 'base64'));

    return {
      score: 100
    };
  }
}

export default LoadAudit;