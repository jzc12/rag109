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

export const selectAvailableBackend = async () => {
    const rawEnv = import.meta.env.VITE_API_BASE_URL;
    //console.log("VITE_API_BASE_URLS =", rawEnv);
    const urls = rawEnv?.split(",").map(u => u.trim());
    if (!urls || urls.length === 0) {
        console.warn("没有配置任何后端地址！");
        return null;
    }

    for (const url of urls) {
        try {
            const res = await fetchWithTimeout(`${url}${HEALTH_ENDPOINT}`, 3000);
            if (res.ok) {
                console.log("backend available:", url);
                avilable_url = url;
                return url;
            } else {
                console.warn(`后端 ${url} 返回非 200：`, res.status);
            }
        } catch (e) {
            console.warn(`请求 ${url} 失败：`, e.message);
        }
    }

    return null;
};



export const get_backend_url = () => {
    //console.log(avilable_url)
    return avilable_url;
};
