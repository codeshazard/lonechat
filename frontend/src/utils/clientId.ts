const CLIENT_ID_KEY = "lonechat_client_id";

/**
 * Returns a persistent unique client identifier stored in localStorage.
 * Multiple tabs in the same browser will share this ID, allowing the backend
 * presence tracking to count the user as exactly ONE online person.
 */
export function getPersistentClientId(): string {
    try {
        let clientId = localStorage.getItem(CLIENT_ID_KEY);
        if (!clientId || clientId.trim().length === 0) {
            if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
                clientId = crypto.randomUUID();
            } else {
                clientId = "client_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
            }
            localStorage.setItem(CLIENT_ID_KEY, clientId);
        }
        return clientId;
    } catch (_e) {
        // In case localStorage is blocked or throws
        return "session_" + Math.random().toString(36).substring(2, 15);
    }
}
