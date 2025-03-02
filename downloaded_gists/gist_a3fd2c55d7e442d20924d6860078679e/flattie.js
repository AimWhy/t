function iter(output, nullish, sep, val, key) {
	var k, pfx = key ? (key + sep) : key;

	if (val == null) {
		if (nullish) output[key] = val;
	} else if (typeof val != 'object') {
		output[key] = val;
	} else if (Array.isArray(val)) {
		for (k=0; k < val.length; k++) {
			iter(output, nullish, sep, val[k], pfx + k);
		}
	} else {
		for (k in val) {
			iter(output, nullish, sep, val[k], pfx + k);
		}
	}
}

export function flattie(input, glue, toNull) {
	var output = {};
	if (typeof input == 'object') {
		iter(output, !!toNull, glue || '.', input, '');
	}
	return output;
}

/************************************/

function empty(key) {
	return key === key ? [] : {};
}

export function nestie(input, glue) {
	glue = glue || '.';
	var arr, tmp, output;
	var i=0, k, key;

	for (k in input) {
		tmp = output; // reset
		arr = k.split(glue);

		for (i=0; i < arr.length;) {
			key = arr[i++];

			if (tmp == null) {
				tmp = empty(+key);
				output = output || tmp;
			}

			if (key == '__proto__' || key == 'constructor' || key == 'prototype') break;

			if (i < arr.length) {
				if (key in tmp) {
					tmp = tmp[key];
				} else {
					tmp = tmp[key] = empty(+arr[i]);
				}
			} else {
				tmp[key] = input[k];
			}
		}
	}

	return output;
}