export function BroadcastChannel(name = "nextauth.message") {
    return {
        /** Get notified by other tabs/windows. */
        receive(onReceive) {
            const handler = (event) => {
                if (event.key !== name)
                    return;
                const message = JSON.parse(event.newValue ?? "{}");
                if (message?.event !== "session" || !message?.data)
                    return;
                onReceive(message);
            };
            window.addEventListener("storage", handler);
            return () => window.removeEventListener("storage", handler);
        },
        /** Notify other tabs/windows. */
        post(message) {
            if (typeof window === "undefined")
                return;
            localStorage.setItem(name, JSON.stringify({ ...message, timestamp: now() }));
        },
    };
}