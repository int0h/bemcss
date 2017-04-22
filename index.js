const css = require('css');
const colors = require('colors/safe');
const fs = require('fs-extra');
const path = require('path');

const {parseBem, stringifyBem, bemPath} = require('./bem-utils');

function postProcessCss(code){
	return new Promise((res)=>res(code));
}

function err(...args){
	console.error(colors.red('Error: '), ...args.map(
		item => colors.white(item)
	));
};

function findFirstMatch(str) {
	let res = /\.([\d\w\-\_]*)/.exec(str);
	if (!res) {
		err('first piece of selector must be a class');
		process.exit();
	}
	res = res[1];
	return res;
}

function trace(rule){
	const s = rule.position.start
	return rule.position.source + ` [${s.line}:${s.column}]`;
}

function getFileName(str){
	return path.parse(str).name;
}

function ruleIterator(bemObj, badRules, rule) {
	const firstMatch = findFirstMatch(rule.selectors[0]);
	if (firstMatch !== stringifyBem(bemObj)){
		badRules.push(rule);
		err(trace(rule), ' - ', colors.red(rule.selectors[0]), ` must be in separate file!`);
		return false;
	}
	return true;
}

function parseFile(filePath) {
	const cssCode = fs.readFileSync(filePath, 'utf-8');
	return css.parse(cssCode, {source: filePath});
}

function hasRule(ast, rule) {
	const ruleList = ast.stylesheet.rules.map(i => i.selectors.join(','));
	const ruleSelector = rule.selectors.join(',');
	return ruleList.includes(ruleSelector);
}

function addRuleToFile(root, ruleObj) {
	const ruleText = ruleObj.selectors.join(',');
	const firstMatch = findFirstMatch(ruleObj.selectors[0]);
	const bemObj = parseBem(firstMatch);
	const filePath = root + '/' + bemPath(bemObj);
	fs.ensureFileSync(filePath);
	let ast = parseFile(filePath);
	if (hasRule(ast, ruleObj)) {
		err(
			'selector conflict in file',
			colors.red(filePath),
			'-',
			colors.red(ruleText)
		);
		return false;
	}
	ast.stylesheet.rules.push(ruleObj);
	postProcessCss(css.stringify(ast))
		.then(newCss => {
			fs.writeFileSync(filePath, newCss)
		});
	console.log(colors.green(`\t... ${ruleText} is fixed!`));
	return true;
}

function processFile(bemObj, filePath, opts) {
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
	badRules.forEach(addRuleToFile.bind(null, opts.root));
	if (badRules.length !== 0) {
		console.log(colors.green(`\t... ${filePath} is fixed!`));		
	}
	
	postProcessCss(css.stringify(ast))
		.then(newCss => {
			fs.writeFileSync(filePath, newCss)
		});
}

function processMods(modsDir, opts) {
	fs.readdirSync(modsDir).forEach(fileName => {
		const filePath = path.join(modsDir, fileName);
		if (fs.statSync(filePath).isDirectory()) {
			console.warn(`Directory ${fileName} in mod directory`);
			return;
		}
		const bemObj = parseBem(getFileName(fileName));		
		processFile(bemObj, filePath, opts);
	})
}

function processElem(elemDir, parent, opts) {
	fs.readdirSync(elemDir).forEach(fileName => {
		const filePath = path.join(elemDir, fileName);
		if (fs.statSync(filePath).isDirectory()) {
			if (/^_/.test(fileName)){
				processMods(filePath, opts);
				return;
			}
			console.warn(`Directory ${fileName} in elem directory`);
			return;
		}
		if (getFileName(fileName) !== parent.name + getFileName(elemDir)) {
			return;
		}
		const bemObj = parseBem(getFileName(fileName));
		processFile(bemObj, filePath, opts);
	})
}

function processFolder(opts) {
	const name = getFileName(opts.root);
	const mainFilePath = opts.root + '/' + name + '.css';
	const bemObj = {name};
	if (fs.existsSync(mainFilePath)) {
		processFile(bemObj, mainFilePath, opts);
	};
	fs.readdirSync(opts.root).forEach(item => {
		const itemPath = path.join(opts.root, item);
		if (fs.statSync(itemPath).isFile()) {			
			return;
		}
		if (/^__/.test(item)){
			processElem(itemPath, bemObj, opts);
			return;
		}
		if (/^_/.test(item)){
			processMods(itemPath, opts);
			return;
		}
	})
}

function setPostProcessor(fn) {
	postProcessCss = fn;
}

module.exports = {processFolder, setPostProcessor};
