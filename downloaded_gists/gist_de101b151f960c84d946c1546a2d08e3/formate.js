const _formatNormalize = (formatter) => {
	if (typeof formatter === 'function') {
		return formatter;
	}
	if (typeof formatter !== 'string') {
		throw new TypeError('must be string or function');
	}

	if (formatter === 'date') {
		formatter = 'yyyy-MM-dd';
	} else if (formatter === 'datetime') {
		formatter = 'yyyy-MM-dd HH:mm:ss';
	}
	return (dateInfo) => {
		const { yyyy, MM, dd, HH, mm, ss, ms } = dateInfo;
		return formatter
			.replace('yyyy', yyyy)
			.replace('MM', MM)
			.replace('dd', dd)
			.replace('HH', HH)
			.replace('mm', mm)
			.replace('ss', ss)
			.replace('ms', ms);
	};
};

export const formate = (date, formatter, isPad = false) => {
	formatter = _formatNormalize(formatter);
	const dateInfo = {
		yyyy: date
			.getFullYear()
			.toString()
			.padStart(isPad ? 4 : 0, '0'),
		MM: (date.getMonth() + 1).toString().padStart(isPad ? 2 : 0, '0'),
		dd: date
			.getDate()
			.toString()
			.padStart(isPad ? 2 : 0, '0'),
		HH: date
			.getHours()
			.toString()
			.padStart(isPad ? 2 : 0, '0'),
		mm: date
			.getMinutes()
			.toString()
			.padStart(isPad ? 2 : 0, '0'),
		ss: date
			.getSeconds()
			.toString()
			.padStart(isPad ? 2 : 0, '0'),
		ms: date
			.getMilliseconds()
			.toString()
			.padStart(isPad ? 2 : 0, '0')
	};

	return formatter(dateInfo);
};
