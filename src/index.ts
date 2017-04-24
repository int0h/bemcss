import css from 'css';
import colors from 'colors/safe';
import fs from 'fs-extra';
import * as path from 'path';

import {parseBem, stringifyBem, bemPath} from './bem-utils';

let postProcessCss = function postProcessCss(code){
	return new Promise((res)=>res(code));
}

function err(...args){
	console.error(colors.red('Error: '), ...args.map(
		item => colors.white(item)
	));
};

function findFirstMatch(str) {
	let res: string | string[] = /\.([\d\w\-\_]*)/.exec(str);
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

async function addRuleToFile(root, ruleObj) {
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
	const newCss = await postProcessCss(css.stringify(ast));
	fs.writeFileSync(filePath, newCss);
	console.log(colors.green(`\t... ${ruleText} is fixed!`));
	return true;
}

async function processFile(bemObj, filePath, opts) {
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
	const newCss = await postProcessCss(css.stringify(ast));
	fs.writeFileSync(filePath, newCss);
}

async function processMods(modsDir, opts) {
	const fileList = fs.readdirSync(modsDir);
	for (const fileName of fileList) {
		const filePath = path.join(modsDir, fileName);
		if (fs.statSync(filePath).isDirectory()) {
			console.warn(`Directory ${fileName} in mod directory`);
			return;
		}
		const bemObj = parseBem(getFileName(fileName));		
		await processFile(bemObj, filePath, opts);
	}
}

async function processElem(elemDir, parent, opts) {
	const fileList = fs.readdirSync(elemDir);
	for (const fileName of fileList) {
		const filePath = path.join(elemDir, fileName);
		if (fs.statSync(filePath).isDirectory()) {
			if (/^_/.test(fileName)){
				await processMods(filePath, opts);
				return;
			}
			console.warn(`Directory ${fileName} in elem directory`);
			return;
		}
		if (getFileName(fileName) !== parent.name + getFileName(elemDir)) {
			return;
		}
		const bemObj = parseBem(getFileName(fileName));
		await processFile(bemObj, filePath, opts);
	}
}

export async function processFolder(opts) {
	const name = getFileName(opts.root);
	const mainFilePath = opts.root + '/' + name + '.css';
	const bemObj = {name};
	if (fs.existsSync(mainFilePath)) {
		await processFile(bemObj, mainFilePath, opts);
	};
	const fileList = fs.readdirSync(opts.root);
	for (const item of fileList) {
		const itemPath = path.join(opts.root, item);
		if (fs.statSync(itemPath).isFile()) {			
			return;
		}
		if (/^__/.test(item)){
			await processElem(itemPath, bemObj, opts);
			return;
		}
		if (/^_/.test(item)){
			await processMods(itemPath, opts);
			return;
		}
	}
}

export function setPostProcessor(fn) {
	postProcessCss = fn;
}

