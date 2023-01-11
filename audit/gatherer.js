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

async function getProperty(property, node) {
  return await (await node.getProperty(property)).jsonValue();
}

const isOccluded = (anchor, page) =>
  page.evaluate((el) => {
    function isOccluded(element) {
      const { x, y, width, height } = element.getBoundingClientRect();
      const padding = 10;

      // We inset {padding}px to avoid the edges of the button.
      const elementsTopLeft = document.elementsFromPoint(
        x + padding,
        y + padding
      );
      const elementsTopRight = document.elementsFromPoint(
        x + width - padding,
        y + padding
      );
      const elementsBottomLeft = document.elementsFromPoint(
        x + padding,
        y + height - padding
      );
      const elementsBottomRight = document.elementsFromPoint(
        x + width - padding,
        y + height - padding
      );

      if (
        elementsTopLeft.indexOf(element) == -1 ||
        elementsTopRight.indexOf(element) == -1 ||
        elementsBottomLeft.indexOf(element) == -1 ||
        elementsBottomRight.indexOf(element) == -1
      ) {
        return true;
      }

      return false;
    }

    el.scrollIntoView({
      behavior: "auto",
      block: "center",
      inline: "center",
    }); // reduce the chance of position: fixed elements blocking this element.

    if (isOccluded(el)) {
      return { width: 0, height: 0 };
    }

    const { x, y, width, height } = el.getBoundingClientRect();

    const elements = document.elementsFromPoint(x + width / 2, y + height / 2);

    // We only want the button where it is clearly the top level element.
    if (elements.indexOf(el) > -1) {
      return {
        left: Math.floor(Math.max(x - 10, 0) + scrollX),
        top: Math.floor(Math.max(y - 10, 0) + scrollY),
        width: Math.ceil(width + 20),
        height: Math.ceil(height + 20)
      };
    }
    // We ignore these later.
    return { width: 0, height: 0 };
  }, anchor);

class NonOccludedAnchorElements extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} options
   * @param {LH.Gatherer.LoadData} loadData
   */
  async afterPass(options, loadData) {
    const { driver } = options;
    const { page, executionContext } = await connect(driver);
    const anchors = await page.$$("a");

    const unoccludedAnchors = [];
    const elementSummaries = [];

    for (const anchor of anchors) {
      const result = await isOccluded(anchor, page);
      if (result.width > 0 && result.height > 0) {
        // result is more accurate.
        unoccludedAnchors.push([anchor.asElement(), result]);
      }
    }

    for (const [anchor, position] of unoccludedAnchors) {
      const nodeDetailsFunction = pageFunctions.getNodeDetailsString;
      // We need are jamming lighthouse's getNodeDetails function into a new function so we can pass it an argument in puppeteer... it's a hack..
      const func = new Function('a', `${nodeDetailsFunction}; return getNodeDetails(a)`);
      const nodeDetails = await anchor.evaluate(func)

      // The bounding box is relative to the mainframe, but we want it relative to the top.
      nodeDetails.newBoundingRect = position;

      elementSummaries.push({
        tagName: await getProperty("tagName", anchor),
        rel: await getProperty("rel", anchor),
        href: await getProperty("href", anchor),
        role: await getProperty("role", anchor),
        name: await getProperty("name", anchor),
        node: nodeDetails // Might need to manipulate this to the correct coordinates.
      });
    }

    /**
     * @return {LH.Gatherer.PhaseResult}
     */
    return elementSummaries;
  }
}

module.exports = NonOccludedAnchorElements;
