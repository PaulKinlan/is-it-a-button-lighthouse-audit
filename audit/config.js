module.exports = {
  extends: 'lighthouse:default',
  audits: [
    'anchor-looks-like-a-button'
  ],
  passes: [
    {
      passName: 'defaultPass',
      gatherers: [
        './gatherer.js',
        './big-screenshot-gatherer.js'
      ]
    }
  ],
  categories: {
    custom_ally: {
      title: 'ML A11Y Metrics',
      description: 'A11Y Metrics done by ML.',
      auditRefs: [
        // When we add more custom audits, `weight` controls how they're averaged together.
        {id: 'anchor-looks-like-a-button', weight: 1},
      ],
    },
  },
};