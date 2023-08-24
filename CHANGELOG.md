<a name="1.5.0"></a>
# [1.5.0](https://github.com/ts-stack/markdown/releases/tag/1.5.0) (2023-08-24)

### Features

- Now `Marked.parse` merges options ([#28](https://github.com/ts-stack/markdown/issues/28)):

```ts
import { Marked, MarkedOptions } from '@ts-stack/markdown';

const options: MarkedOptions = { sanitize: true };
console.log(Marked.parse('some string', options)); // work with v1.5 (fail with v1.4 and earlier)
```

<a name="1.4.0"></a>
## [1.4.0](https://github.com/ts-stack/markdown/releases/tag/1.4.0) (2021-03-29)

### Features

- Allow multiple words on gfm code ([#20](https://github.com/ts-stack/markdown/pull/20)).

<a name="1.3.0"></a>
## [1.3.0](https://github.com/ts-stack/markdown/releases/tag/1.3.0) (2020-10-07)

### Features

- Added support for Angular Package Format. With this feature you can use this library both on the frontend and on the backend, and on the frontend the webpack can choose the most suitable package for a specific client.
