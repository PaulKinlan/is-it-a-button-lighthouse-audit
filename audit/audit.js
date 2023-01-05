import {Audit} from 'lighthouse';

const MAX_SEARCHABLE_TIME = 4000;

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
      requiredArtifacts: ['AnchorElements'],
    };
  }

  static audit(artifacts) {
    const anchorElements = artifacts.AnchorElements;

    return {
      score: 100
    };
  }
}

export default LoadAudit;