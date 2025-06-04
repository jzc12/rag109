// utils/markdownRenderer.js
import { marked } from 'marked';
import DOMPurify from 'dompurify';


marked.setOptions({
    breaks: true,
    gfm: true,
    xhtml: true,
});

function preprocessMarkdown(content) {
    return content
        .replace(/<br\s*\/?>/gi, '\n') // 把所有 <br> 替换为换行
        .replace(/\r\n|\r/g, '\n') // 统一换行符格式
        .replace(/^(\s{0,3})(#{1,6})([^\s#])/gm, '$1$2 $3') // # 后补空格
        .replace(/^(\s{0,3})#{4,6}(\s)/gm, '$1###$2') // 降级标题
        .replace(/\n{3,}/g, '\n\n'); // 避免出现多个空行
}





// 安全 Markdown 渲染
export function renderMarkdown(content) {
    const preprocessed = preprocessMarkdown(content);
    const html = marked.parse(preprocessed);
    return DOMPurify.sanitize(html);
}

// 实时渲染的节流函数
export function createThrottledRenderer(element, delay = 200) {
    let timeout = null;
    let accumulatedContent = '';

    return (chunk) => {
        accumulatedContent += chunk;

        if (!timeout) {
            timeout = setTimeout(() => {
                element.innerHTML = renderMarkdown(accumulatedContent);
                element.scrollIntoView({ behavior: 'smooth' });
                timeout = null;
            }, delay);
        }
    };
}