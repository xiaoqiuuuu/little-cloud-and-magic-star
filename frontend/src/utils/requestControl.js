export const createRequestDeduper = () => {
  const pendingRequests = new Map();

  return (key, requestFactory) => {
    const pendingRequest = pendingRequests.get(key);
    if (pendingRequest) {
      return pendingRequest;
    }

    const request = Promise.resolve().then(requestFactory);
    pendingRequests.set(key, request);

    const clearRequest = () => {
      if (pendingRequests.get(key) === request) {
        pendingRequests.delete(key);
      }
    };
    request.then(clearRequest, clearRequest);

    return request;
  };
};


export const createLatestRequestCoordinator = () => {
  const pendingRequests = new Map();

  return (scope, key, requestFactory) => {
    const pendingRequest = pendingRequests.get(scope);
    if (pendingRequest?.key === key) {
      return pendingRequest.request;
    }

    pendingRequest?.controller.abort();

    const controller = new AbortController();
    const request = Promise.resolve().then(() => requestFactory(controller.signal));
    const requestEntry = { controller, key, request };
    pendingRequests.set(scope, requestEntry);

    const clearRequest = () => {
      if (pendingRequests.get(scope) === requestEntry) {
        pendingRequests.delete(scope);
      }
    };
    request.then(clearRequest, clearRequest);

    return request;
  };
};
