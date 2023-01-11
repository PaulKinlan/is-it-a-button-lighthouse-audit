const { Gatherer } = require("lighthouse");
const pageFunctions = require("lighthouse/lighthouse-core/lib/page-functions");
const puppeteer = require("puppeteer");

// Heavily inspired by https://keepinguptodate.com/pages/2021/08/custom-lighthouse-audit/ and https://github.com/GoogleChrome/lighthouse/blob/main/docs/recipes/custom-gatherer-puppeteer/custom-gatherer.js

async function connect(driver) {
  const browser = await puppeteer.connect({
    browserWSEndpoint: await driver.wsEndpoint(),
    defaultViewport: null,
  });
  const { targetInfo } = await driver.sendCommand("Target.getTargetInfo");
  const puppeteerTarget = (await browser.targets()).find(
    (target) => target._targetId === targetInfo.targetId
  );
  const page = await puppeteerTarget.page();
  return { browser, page, executionContext: driver.executionContext };
}

class BigScreenshot extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} options
   * @param {LH.Gatherer.LoadData} loadData
   */
  async afterPass(options, loadData) {
    const { driver } = options;
    const { page, executionContext } = await connect(driver);

    const devicePixelRatio = await page.evaluate("window.devicePixelRatio");
    const screenshot = await page.screenshot({
      encoding: "base64",
      fullPage: true,
      captureBeyondViewport: true,
    });

    /**
     * @return {LH.Gatherer.PhaseResult}
     */
    return { screenshot, devicePixelRatio };
  }
}

module.exports = BigScreenshot;
