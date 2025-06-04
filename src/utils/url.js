// frontend/src/utils/url.js

export const get_backend_url = () => {
    return import.meta.env.VITE_API_BASE_URL;
};

export const get_front_url = () => {
    return import.meta.env.VITE_FRONT_URL;
};
