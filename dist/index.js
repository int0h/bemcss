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
const css = require("css");
const colors = require("colors/safe");
const fs = require("fs-extra");
const path = require("path");
const bem_utils_1 = require("./bem-utils");
let postProcessCss = function postProcessCss(code) {
    return new Promise((res) => res(code));
};
function err(...args) {
    console.error(colors.red('Error: '), ...args.map(item => colors.white(item)));
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
        err(trace(rule), ' - ', colors.red(rule.selectors[0]), ` must be in separate file!`);
        return false;
    }
    return true;
}
function parseFile(filePath) {
    const cssCode = fs.readFileSync(filePath, 'utf-8');
    return css.parse(cssCode, { source: filePath });
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
        fs.ensureFileSync(filePath);
        let ast = parseFile(filePath);
        if (hasRule(ast, ruleObj)) {
            err('selector conflict in file', colors.red(filePath), '-', colors.red(ruleText));
            return false;
        }
        ast.stylesheet.rules.push(ruleObj);
        const newCss = yield postProcessCss(css.stringify(ast));
        fs.writeFileSync(filePath, newCss);
        console.log(colors.green(`\t... ${ruleText} is fixed!`));
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
            console.log(colors.green(`\t... ${filePath} is fine!`));
        }
        if (!opts.fix) {
            return;
        }
        for (const rule of badRules) {
            yield addRuleToFile(opts.root, rule);
        }
        if (badRules.length !== 0) {
            console.log(colors.green(`\t... ${filePath} is fixed!`));
        }
        const newCss = yield postProcessCss(css.stringify(ast));
        fs.writeFileSync(filePath, newCss);
    });
}
function processMods(modsDir, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileList = fs.readdirSync(modsDir);
        for (const fileName of fileList) {
            const filePath = path.join(modsDir, fileName);
            if (fs.statSync(filePath).isDirectory()) {
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
        const fileList = fs.readdirSync(elemDir);
        for (const fileName of fileList) {
            const filePath = path.join(elemDir, fileName);
            if (fs.statSync(filePath).isDirectory()) {
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
        if (fs.existsSync(mainFilePath)) {
            yield processFile(bemObj, mainFilePath, opts);
        }
        ;
        const fileList = fs.readdirSync(opts.root);
        for (const item of fileList) {
            const itemPath = path.join(opts.root, item);
            if (fs.statSync(itemPath).isFile()) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiL1VzZXJzL2stdmlsZ2VsbS90ZW1wL2JlbWNzcy9zcmMvIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsMkJBQTJCO0FBQzNCLHNDQUFzQztBQUN0QywrQkFBK0I7QUFDL0IsNkJBQTZCO0FBRTdCLDJDQUE0RDtBQUU1RCxJQUFJLGNBQWMsR0FBRyx3QkFBd0IsSUFBSTtJQUNoRCxNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxHQUFHLEtBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDdEMsQ0FBQyxDQUFBO0FBRUQsYUFBYSxHQUFHLElBQUk7SUFDbkIsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDL0MsSUFBSSxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQzFCLENBQUMsQ0FBQztBQUNKLENBQUM7QUFBQSxDQUFDO0FBRUYsd0JBQXdCLEdBQUc7SUFDMUIsSUFBSSxHQUFHLEdBQXNCLGlCQUFpQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN6RCxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDVixHQUFHLENBQUMseUNBQXlDLENBQUMsQ0FBQztRQUMvQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDaEIsQ0FBQztJQUNELEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDYixNQUFNLENBQUMsR0FBRyxDQUFDO0FBQ1osQ0FBQztBQUVELGVBQWUsSUFBSTtJQUNsQixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQTtJQUM3QixNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFD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