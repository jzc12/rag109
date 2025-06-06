// frontend/src/utils/url.js

const HEALTH_ENDPOINT = "/health";
let avilable_url = null;

/**
 * 从多个后端中选择一个可用的
 * @returns {Promise<string|null>} 可用后端 URL 或 null
*/
const fetchWithTimeout = async (url, timeoutMillis = 3000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMillis);

    try {
        const response = await fetch(url, {
            method: "GET",
            signal: controller.signal,
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
};

const selectAvailableBackend = async () => {
    const urls = import.meta.env.VITE_API_BASE_URLS?.split(",").map(u => u.trim());
    if (!urls || urls.length === 0) return null;

    for (const url of urls) {
        try {
            const res = await fetchWithTimeout(`${url}${HEALTH_ENDPOINT}`, 3000);
            if (res.ok) {
                avilable_url = url;
                return url;
            }
        } catch (e) {
            // 请求失败或超时则跳过
            continue;
        }
    }

    return null;
};


export const get_backend_url = () => {
    console.log(avilable_url)
    return avilable_url;
};
