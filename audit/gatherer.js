import {Gatherer} from 'lighthouse';

/**
 * @fileoverview Extracts the anchor elements from a page and checks to see if they look like a button.
 */

class AnchorLooksLikeAButton extends Gatherer {
  afterPass(options) {
    const driver = options.driver;

    return driver.executionContext.evaluateAsync('window.myLoadMetrics')
      // Ensure returned value is what we expect.
      .then(loadMetrics => {
        if (!loadMetrics || loadMetrics.searchableTime === undefined) {
          // Throw if page didn't provide the metrics we expect. This isn't
          // fatal -- the Lighthouse run will continue, but any audits that
          // depend on this gatherer will show this error string in the report.
          throw new Error('Unable to find load metrics in page');
        }
        return loadMetrics;
      });
  }
}

export default AnchorLooksLikeAButton;