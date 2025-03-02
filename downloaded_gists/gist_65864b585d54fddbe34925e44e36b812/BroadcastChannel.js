export function BroadcastChannel(name = "nextauth.message") {
  return {
    receive(onReceive) {
      const handler = (event) => {
        if (event.key !== name) {
          return;
        }

        const message = JSON.parse(event.newValue ?? "{}");
        if (message?.event !== "session" || !message?.data) {
          return;
        }

        onReceive(message);
      };

      window.addEventListener("storage", handler);

      return () => window.removeEventListener("storage", handler);
    },

    post(message) {
      try {
        localStorage.setItem(name, JSON.stringify({
          ...message,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn(e);
      }
    },
  };
}