export default {
  // 1. Run your custom tests along with all the default Lighthouse tests.
  extends: 'lighthouse:default',

  // 2. Add gatherer to the default Lighthouse load ('pass') of the page.
  passes: [{
    passName: 'defaultPass',
    gatherers: [
      'anchor-looks-like-a-button-gatherer',
    ],
  }],

  // 3. Add custom audit to the list of audits 'lighthouse:default' will run.
  audits: [
    'anchor-looks-like-a-button-audit',
  ],

  // 4. Create a new 'My site metrics' section in the default report for our results.
  categories: {
    mysite: {
      title: 'Some A11Y metrics',
      description: 'A11Y Metrics done by ML.',
      auditRefs: [
        // When we add more custom audits, `weight` controls how they're averaged together.
        {id: 'anchor-looks-like-a-button-audit', weight: 1},
      ],
    },
  },
};