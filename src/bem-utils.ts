export function parseBem(str) {
	const [block, elem] = str.split('__').map(part => {
		const [owner, modName, modVal] = part.split('_');
		let res = {
			name: owner,
		};
		if (modName){
			if (!modVal) {
				throw new Error('no mod value');
			}
			res = {
				...res,
				modName, modVal
			};
		}
		return res;
	});
	block.elem = elem || null;
	if (block.modName && block.elem) {
		throw new Error('elems of modded blocks are not allowed')
	}
	return block;
}

export function stringifyBem(bemObj) {
	let res = bemObj.name;
	if (bemObj.modName) {
		res = [bemObj.name, bemObj.modName, bemObj.modVal].join('_');
	}
	if (bemObj.elem) {
		res = [res, stringifyBem(bemObj.elem)].join('__');
	}
	return res;
}

export function bemPath(bemObj) {
	let folderName = '';
	if (bemObj.elem) {
		folderName = '__' + bemObj.elem.name + '/';
		if (bemObj.elem.modName) {
			folderName += '_' + bemObj.elem.modName + '/'
		}
	}
	if (bemObj.modName) {
		folderName = '_' + bemObj.modName + '/'; 		
	}
	return folderName + stringifyBem(bemObj) + '.css';
}
