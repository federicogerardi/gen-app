/* Ensure Next.js web APIs exist before loading test modules */

if (!global.Request) {
  global.Request = class Request {
    constructor(input, init) {
      this.url = typeof input === 'string' ? input : '';
      this.init = init;
    }

    async json() {
      return null;
    }

    async text() {
      return '';
    }
  };
}

if (!global.Response) {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body;
      this.init = init;
    }

    async json() {
      return null;
    }

    async text() {
      return '';
    }
  };
}

if (!global.ReadableStream) {
  global.ReadableStream = class ReadableStream {};
}

if (!global.fetch) {
  global.fetch = async function fetch() {
    return new global.Response();
  };
}
