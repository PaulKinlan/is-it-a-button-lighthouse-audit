# Is it a button Lighthouse audit?

This is an experiemental Lighthouse Audit that will look at all the `<a>` elements on a page and try to determine if it looks like a button or not.

Learn more about [why](https://paul.kinlan.me/button-and-link-scraping-for-ml-training/) this is getting built.

## Caveats

1. The ML currently operates on a heavily compressed rendering of the page which the Model is not great at.
2. There are some training issues with links that go over multiple lines.

## How to use

`lighthouse https://paul.kinlan.me/ --config-path=./audit/config.js --view`