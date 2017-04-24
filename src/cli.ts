import * as bemcss from './index';
import * as minimist from 'minimist';
import * as Comb from 'csscomb';
import * as fs from 'fs-extra';

const opts = minimist(process.argv.slice(2));
opts.root = opts._[0];
opts.fix = opts.f;
const dirPath = opts.root;

if (!dirPath){
	console.error('no file present');
	console.info(`Usage: bemcss [-c][-f] <block folder>
	-c - path to csscomb config
	-f - fix issues
	`);
	process.exit();
}
if (opts.c) {
	const comb = new Comb();
	const config = JSON.parse(fs.readFileSync(opts.c, 'utf-8'));
	comb.configure(config);
	bemcss.setPostProcessor(function (code) {
		if (!code){
			return new Promise((resolve)=>resolve(code));
		}
		return comb.processString(code);
	});
}

bemcss.processFolder(opts).then(() => 
	console.log('...Done!')
);