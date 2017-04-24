"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const css_1 = require("css");
const safe_1 = require("colors/safe");
const fs_extra_1 = require("fs-extra");
const path = require("path");
const bem_utils_1 = require("./bem-utils");
let postProcessCss = function postProcessCss(code) {
    return new Promise((res) => res(code));
};
function err(...args) {
    console.error(safe_1.default.red('Error: '), ...args.map(item => safe_1.default.white(item)));
}
;
function findFirstMatch(str) {
    let res = /\.([\d\w\-\_]*)/.exec(str);
    if (!res) {
        err('first piece of selector must be a class');
        process.exit();
    }
    res = res[1];
    return res;
}
function trace(rule) {
    const s = rule.position.start;
    return rule.position.source + ` [${s.line}:${s.column}]`;
}
function getFileName(str) {
    return path.parse(str).name;
}
function ruleIterator(bemObj, badRules, rule) {
    const firstMatch = findFirstMatch(rule.selectors[0]);
    if (firstMatch !== bem_utils_1.stringifyBem(bemObj)) {
        badRules.push(rule);
        err(trace(rule), ' - ', safe_1.default.red(rule.selectors[0]), ` must be in separate file!`);
        return false;
    }
    return true;
}
function parseFile(filePath) {
    const cssCode = fs_extra_1.default.readFileSync(filePath, 'utf-8');
    return css_1.default.parse(cssCode, { source: filePath });
}
function hasRule(ast, rule) {
    const ruleList = ast.stylesheet.rules.map(i => i.selectors.join(','));
    const ruleSelector = rule.selectors.join(',');
    return ruleList.includes(ruleSelector);
}
function addRuleToFile(root, ruleObj) {
    return __awaiter(this, void 0, void 0, function* () {
        const ruleText = ruleObj.selectors.join(',');
        const firstMatch = findFirstMatch(ruleObj.selectors[0]);
        const bemObj = bem_utils_1.parseBem(firstMatch);
        const filePath = root + '/' + bem_utils_1.bemPath(bemObj);
        fs_extra_1.default.ensureFileSync(filePath);
        let ast = parseFile(filePath);
        if (hasRule(ast, ruleObj)) {
            err('selector conflict in file', safe_1.default.red(filePath), '-', safe_1.default.red(ruleText));
            return false;
        }
        ast.stylesheet.rules.push(ruleObj);
        const newCss = yield postProcessCss(css_1.default.stringify(ast));
        fs_extra_1.default.writeFileSync(filePath, newCss);
        console.log(safe_1.default.green(`\t... ${ruleText} is fixed!`));
        return true;
    });
}
function processFile(bemObj, filePath, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Processing file: ${filePath}`);
        let badRules = [];
        let ast = parseFile(filePath);
        ast.stylesheet.rules = ast.stylesheet.rules.filter(ruleIterator.bind(null, bemObj, badRules));
        if (badRules.length === 0) {
            console.log(safe_1.default.green(`\t... ${filePath} is fine!`));
        }
        if (!opts.fix) {
            return;
        }
        badRules.forEach(addRuleToFile.bind(null, opts.root));
        if (badRules.length !== 0) {
            console.log(safe_1.default.green(`\t... ${filePath} is fixed!`));
        }
        const newCss = yield postProcessCss(css_1.default.stringify(ast));
        fs_extra_1.default.writeFileSync(filePath, newCss);
    });
}
function processMods(modsDir, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileList = fs_extra_1.default.readdirSync(modsDir);
        for (const fileName of fileList) {
            const filePath = path.join(modsDir, fileName);
            if (fs_extra_1.default.statSync(filePath).isDirectory()) {
                console.warn(`Directory ${fileName} in mod directory`);
                return;
            }
            const bemObj = bem_utils_1.parseBem(getFileName(fileName));
            yield processFile(bemObj, filePath, opts);
        }
    });
}
function processElem(elemDir, parent, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileList = fs_extra_1.default.readdirSync(elemDir);
        for (const fileName of fileList) {
            const filePath = path.join(elemDir, fileName);
            if (fs_extra_1.default.statSync(filePath).isDirectory()) {
                if (/^_/.test(fileName)) {
                    yield processMods(filePath, opts);
                    return;
                }
                console.warn(`Directory ${fileName} in elem directory`);
                return;
            }
            if (getFileName(fileName) !== parent.name + getFileName(elemDir)) {
                return;
            }
            const bemObj = bem_utils_1.parseBem(getFileName(fileName));
            yield processFile(bemObj, filePath, opts);
        }
    });
}
function processFolder(opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const name = getFileName(opts.root);
        const mainFilePath = opts.root + '/' + name + '.css';
        const bemObj = { name };
        if (fs_extra_1.default.existsSync(mainFilePath)) {
            yield processFile(bemObj, mainFilePath, opts);
        }
        ;
        const fileList = fs_extra_1.default.readdirSync(opts.root);
        for (const item of fileList) {
            const itemPath = path.join(opts.root, item);
            if (fs_extra_1.default.statSync(itemPath).isFile()) {
                return;
            }
            if (/^__/.test(item)) {
                yield processElem(itemPath, bemObj, opts);
                return;
            }
            if (/^_/.test(item)) {
                yield processMods(itemPath, opts);
                return;
            }
        }
    });
}
exports.processFolder = processFolder;
function setPostProcessor(fn) {
    postProcessCss = fn;
}
exports.setPostProcessor = setPostProcessor;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLDZCQUFzQjtBQUN0QixzQ0FBaUM7QUFDakMsdUNBQTBCO0FBQzFCLDZCQUE2QjtBQUU3QiwyQ0FBNEQ7QUFFNUQsSUFBSSxjQUFjLEdBQUcsd0JBQXdCLElBQUk7SUFDaEQsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsR0FBRyxLQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3RDLENBQUMsQ0FBQTtBQUVELGFBQWEsR0FBRyxJQUFJO0lBQ25CLE9BQU8sQ0FBQyxLQUFLLENBQUMsY0FBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQy9DLElBQUksSUFBSSxjQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUMxQixDQUFDLENBQUM7QUFDSixDQUFDO0FBQUEsQ0FBQztBQUVGLHdCQUF3QixHQUFHO0lBQzFCLElBQUksR0FBRyxHQUFzQixpQkFBaUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDekQsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ1YsR0FBRyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7UUFDL0MsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ2hCLENBQUM7SUFDRCxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2IsTUFBTSxDQUFDLEdBQUcsQ0FBQztBQUNaLENBQUM7QUFFRCxlQUFlLElBQUk7SUFDbEIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUE7SUFDN0IsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMs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TUFBTSxJQUFJLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQztZQUM3QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDNUMsRUFBRSxDQUFDLENBQUMsa0JBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNwQyxNQUFNLENBQUM7WUFDUixDQUFDO1lBQ0QsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBLENBQUM7Z0JBQ3JCLE1BQU0sV0FBVyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzFDLE1BQU0sQ0FBQztZQUNSLENBQUM7WUFDRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUEsQ0FBQztnQkFDcEIsTUFBTSxXQUFXLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNsQyxNQUFNLENBQUM7WUFDUixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FBQTtBQXRCRCxzQ0FzQkM7QUFFRCwwQkFBaUMsRUFBRTtJQUNsQyxjQUFjLEdBQUcsRUFBRSxDQUFDO0FBQ3JCLENBQUM7QUFGRCw0Q0FFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjc3MgZnJvbSAnY3NzJztcbmltcG9ydCBjb2xvcnMgZnJvbSAnY29sb3JzL3NhZmUnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbmltcG9ydCB7cGFyc2VCZW0sIHN0cmluZ2lmeUJlbSwgYmVtUGF0aH0gZnJvbSAnLi9iZW0tdXRpbHMnO1xuXG5sZXQgcG9zdFByb2Nlc3NDc3MgPSBmdW5jdGlvbiBwb3N0UHJvY2Vzc0Nzcyhjb2RlKXtcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXMpPT5yZXMoY29kZSkpO1xufVxuXG5mdW5jdGlvbiBlcnIoLi4uYXJncyl7XG5cdGNvbnNvbGUuZXJyb3IoY29sb3JzLnJlZCgnRXJyb3I6ICcpLCAuLi5hcmdzLm1hcChcblx0XHRpdGVtID0+IGNvbG9ycy53aGl0ZShpdGVtKVxuXHQpKTtcbn07XG5cbmZ1bmN0aW9uIGZpbmRGaXJzdE1hdGNoKHN0cikge1xuXHRsZXQgcmVzOiBzdHJpbmcgfCBzdHJpbmdbXSA9IC9cXC4oW1xcZFxcd1xcLVxcX10qKS8uZXhlYyhzdHIpO1xuXHRpZiAoIXJlcykge1xuXHRcdGVycignZmlyc3QgcGllY2Ugb2Ygc2VsZWN0b3IgbXVzdCBiZSBhIGNsYXNzJyk7XG5cdFx0cHJvY2Vzcy5leGl0KCk7XG5cdH1cblx0cmVzID0gcmVzWzFdO1xuXHRyZXR1cm4gcmVzO1xufVxuXG5mdW5jdGlvbiB0cmFjZShydWxlKXtcblx0Y29uc3QgcyA9IHJ1bGUucG9zaXRpb24uc3RhcnRcblx0cmV0dXJuIHJ1bGUucG9zaXRpb24uc291cmNlICsgYCBbJHtzLmxpbmV9OiR7cy5jb2x1bW59XWA7XG59XG5cbmZ1bmN0aW9uIGdldEZpbGVOYW1lKHN0cil7XG5cdHJldHVybiBwYXRoLnBhcnNlKHN0cikubmFtZTtcbn1cblxuZnVuY3Rpb24gcnVsZUl0ZXJhdG9yKGJlbU9iaiwgYmFkUnVsZXMsIHJ1bGUpIHtcblx0Y29uc3QgZmlyc3RNYXRjaCA9IGZpbmRGaXJzdE1hdGNoKHJ1bGUuc2VsZWN0b3JzWzBdKTtcblx0aWYgKGZpcnN0TWF0Y2ggIT09IHN0cmluZ2lmeUJlbShiZW1PYmopKXtcblx0XHRiYWRSdWxlcy5wdXNoKHJ1bGUpO1xuXHRcdGVycih0cmFjZShydWxlKSwgJyAtICcsIGNvbG9ycy5yZWQocnVsZS5zZWxlY3RvcnNbMF0pLCBgIG11c3QgYmUgaW4gc2VwYXJhdGUgZmlsZSFgKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0cmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHBhcnNlRmlsZShmaWxlUGF0aCkge1xuXHRjb25zdCBjc3NDb2RlID0gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmLTgnKTtcblx0cmV0dXJuIGNzcy5wYXJzZShjc3NDb2RlLCB7c291cmNlOiBmaWxlUGF0aH0pO1xufVxuXG5mdW5jdGlvbiBoYXNSdWxlKGFzdCwgcnVsZSkge1xuXHRjb25zdCBydWxlTGlzdCA9IGFzdC5zdHlsZXNoZWV0LnJ1bGVzLm1hcChpID0+IGkuc2VsZWN0b3JzLmpvaW4oJywnKSk7XG5cdGNvbnN0IHJ1bGVTZWxlY3RvciA9IHJ1bGUuc2VsZWN0b3JzLmpvaW4oJywnKTtcblx0cmV0dXJuIHJ1bGVMaXN0LmluY2x1ZGVzKHJ1bGVTZWxlY3Rvcik7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGFkZFJ1bGVUb0ZpbGUocm9vdCwgcnVsZU9iaikge1xuXHRjb25zdCBydWxlVGV4dCA9IHJ1bGVPYmouc2VsZWN0b3JzLmpvaW4oJywnKTtcblx0Y29uc3QgZmlyc3RNYXRjaCA9IGZpbmRGaXJzdE1hdGNoKHJ1bGVPYmouc2VsZWN0b3JzWzBdKTtcblx0Y29uc3QgYmVtT2JqID0gcGFyc2VCZW0oZmlyc3RNYXRjaCk7XG5cdGNvbnN0IGZpbGVQYXRoID0gcm9vdCArICcvJyArIGJlbVBhdGgoYmVtT2JqKTtcblx0ZnMuZW5zdXJlRmlsZVN5bmMoZmlsZVBhdGgpO1xuXHRsZXQgYXN0ID0gcGFyc2VGaWxlKGZpbGVQYXRoKTtcblx0aWYgKGhhc1J1bGUoYXN0LCBydWxlT2JqKSkge1xuXHRcdGVycihcblx0XHRcdCdzZWxlY3RvciBjb25mbGljdCBpbiBmaWxlJyxcblx0XHRcdGNvbG9ycy5yZWQoZmlsZVBhdGgpLFxuXHRcdFx0Jy0nLFxuXHRcdFx0Y29sb3JzLnJlZChydWxlVGV4dClcblx0XHQpO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHRhc3Quc3R5bGVzaGVldC5ydWxlcy5wdXNoKHJ1bGVPYmopO1xuXHRjb25zdCBuZXdDc3MgPSBhd2FpdCBwb3N0UHJvY2Vzc0Nzcyhjc3Muc3RyaW5naWZ5KGFzdCkpO1xuXHRmcy53cml0ZUZpbGVTeW5jKGZpbGVQYXRoLCBuZXdDc3MpO1xuXHRjb25zb2xlLmxvZyhjb2xvcnMuZ3JlZW4oYFxcdC4uLiAke3J1bGVUZXh0fSBpcyBmaXhlZCFgKSk7XG5cdHJldHVybiB0cnVlO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwcm9jZXNzRmlsZShiZW1PYmosIGZpbGVQYXRoLCBvcHRzKSB7XG5cdGNvbnNvbGUubG9nKGBQcm9jZXNzaW5nIGZpbGU6ICR7ZmlsZVBhdGh9YCk7XG5cdGxldCBiYWRSdWxlcyA9IFtdO1xuXHRsZXQgYXN0ID0gcGFyc2VGaWxlKGZpbGVQYXRoKTtcblx0YXN0LnN0eWxlc2hlZXQucnVsZXMgPSBhc3Quc3R5bGVzaGVldC5ydWxlcy5maWx0ZXIocnVsZUl0ZXJhdG9yLmJpbmQobnVsbCwgYmVtT2JqLCBiYWRSdWxlcykpO1xuXHRpZiAoYmFkUnVsZXMubGVuZ3RoID09PSAwKSB7XG5cdFx0Y29uc29sZS5sb2coY29sb3JzLmdyZWVuKGBcXHQuLi4gJHtmaWxlUGF0aH0gaXMgZmluZSFgKSk7XG5cdH1cblx0aWYgKCFvcHRzLmZpeCkge1xuXHRcdHJldHVybjtcblx0fVxuXHRiYWRSdWxlcy5mb3JFYWNoKGFkZFJ1bGVUb0ZpbGUuYmluZChudWxsLCBvcHRzLnJvb3QpKTtcblx0aWYgKGJhZFJ1bGVzLmxlbmd0aCAhPT0gMCkge1xuXHRcdGNvbnNvbGUubG9nKGNvbG9ycy5ncmVlbihgXFx0Li4uICR7ZmlsZVBhdGh9IGlzIGZpeGVkIWApKTtcdFx0XG5cdH1cblx0Y29uc3QgbmV3Q3NzID0gYXdhaXQgcG9zdFByb2Nlc3NDc3MoY3NzLnN0cmluZ2lmeShhc3QpKTtcblx0ZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgbmV3Q3NzKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc01vZHMobW9kc0Rpciwgb3B0cykge1xuXHRjb25zdCBmaWxlTGlzdCA9IGZzLnJlYWRkaXJTeW5jKG1vZHNEaXIpO1xuXHRmb3IgKGNvbnN0IGZpbGVOYW1lIG9mIGZpbGVMaXN0KSB7XG5cdFx0Y29uc3QgZmlsZVBhdGggPSBwYXRoLmpvaW4obW9kc0RpciwgZmlsZU5hbWUpO1xuXHRcdGlmIChmcy5zdGF0U3luYyhmaWxlUGF0aCkuaXNEaXJlY3RvcnkoKSkge1xuXHRcdFx0Y29uc29sZS53YXJuKGBEaXJlY3RvcnkgJHtmaWxlTmFtZX0gaW4gbW9kIGRpcmVjdG9yeWApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRjb25zdCBiZW1PYmogPSBwYXJzZUJlbShnZXRGaWxlTmFtZShmaWxlTmFtZSkpO1x0XHRcblx0XHRhd2FpdCBwcm9jZXNzRmlsZShiZW1PYmosIGZpbGVQYXRoLCBvcHRzKTtcblx0fVxufVxuXG5hc3luYyBmdW5jdGlvbiBwcm9jZXNzRWxlbShlbGVtRGlyLCBwYXJlbnQsIG9wdHMpIHtcblx0Y29uc3QgZmlsZUxpc3QgPSBmcy5yZWFkZGlyU3luYyhlbGVtRGlyKTtcblx0Zm9yIChjb25zdCBmaWxlTmFtZSBvZiBmaWxlTGlzdCkge1xuXHRcdGNvbnN0IGZpbGVQYXRoID0gcGF0aC5qb2luKGVsZW1EaXIsIGZpbGVOYW1lKTtcblx0XHRpZiAoZnMuc3RhdFN5bmMoZmlsZVBhdGgpLmlzRGlyZWN0b3J5KCkpIHtcblx0XHRcdGlmICgvXl8vLnRlc3QoZmlsZU5hbWUpKXtcblx0XHRcdFx0YXdhaXQgcHJvY2Vzc01vZHMoZmlsZVBhdGgsIG9wdHMpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLndhcm4oYERpcmVjdG9yeSAke2ZpbGVOYW1lfSBpbiBlbGVtIGRpcmVjdG9yeWApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRpZiAoZ2V0RmlsZU5hbWUoZmlsZU5hbWUpICE9PSBwYXJlbnQubmFtZSArIGdldEZpbGVOYW1lKGVsZW1EaXIpKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGNvbnN0IGJlbU9iaiA9IHBhcnNlQmVtKGdldEZpbGVOYW1lKGZpbGVOYW1lKSk7XG5cdFx0YXdhaXQgcHJvY2Vzc0ZpbGUoYmVtT2JqLCBmaWxlUGF0aCwgb3B0cyk7XG5cdH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NGb2xkZXIob3B0cykge1xuXHRjb25zdCBuYW1lID0gZ2V0RmlsZU5hbWUob3B0cy5yb290KTtcblx0Y29uc3QgbWFpbkZpbGVQYXRoID0gb3B0cy5yb290ICsgJy8nICsgbmFtZSArICcuY3NzJztcblx0Y29uc3QgYmVtT2JqID0ge25hbWV9O1xuXHRpZiAoZnMuZXhpc3RzU3luYyhtYWluRmlsZVBhdGgpKSB7XG5cdFx0YXdhaXQgcHJvY2Vzc0ZpbGUoYmVtT2JqLCBtYWluRmlsZVBhdGgsIG9wdHMpO1xuXHR9O1xuXHRjb25zdCBmaWxlTGlzdCA9IGZzLnJlYWRkaXJTeW5jKG9wdHMucm9vdCk7XG5cdGZvciAoY29uc3QgaXRlbSBvZiBmaWxlTGlzdCkge1xuXHRcdGNvbnN0IGl0ZW1QYXRoID0gcGF0aC5qb2luKG9wdHMucm9vdCwgaXRlbSk7XG5cdFx0aWYgKGZzLnN0YXRTeW5jKGl0ZW1QYXRoKS5pc0ZpbGUoKSkge1x0XHRcdFxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRpZiAoL15fXy8udGVzdChpdGVtKSl7XG5cdFx0XHRhd2FpdCBwcm9jZXNzRWxlbShpdGVtUGF0aCwgYmVtT2JqLCBvcHRzKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0aWYgKC9eXy8udGVzdChpdGVtKSl7XG5cdFx0XHRhd2FpdCBwcm9jZXNzTW9kcyhpdGVtUGF0aCwgb3B0cyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHR9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRQb3N0UHJvY2Vzc29yKGZuKSB7XG5cdHBvc3RQcm9jZXNzQ3NzID0gZm47XG59XG5cbiJdfQ==