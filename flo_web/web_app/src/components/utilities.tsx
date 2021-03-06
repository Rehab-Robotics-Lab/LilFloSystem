//https://stackoverflow.com/questions/46140764/polling-api-every-x-seconds-with-react

import { useRef, useEffect } from "react";

const SetInterval = (callback: () => void, delay: number): void => {
  const savedCallback = useRef<() => void>(() => {
    // callback empty on init
  });

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick(): void {
      savedCallback.current();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      tick();
      return (): void => clearInterval(id);
    }
  }, [delay]);
};

export { SetInterval };
