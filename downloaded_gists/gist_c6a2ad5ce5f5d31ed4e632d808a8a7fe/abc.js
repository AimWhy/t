fetch(${JSON.stringify(fileChangesUrl)})
		.then(async request => {
			const reader = request.body.getReader();
			let buffer = '';
      
			while (true) {
				const { done, value } = await reader.read();
				if (done) { break; }
				buffer += new TextDecoder().decode(value);
				const lines = buffer.split('\\n');
				buffer = lines.pop();
        
				for (const line of lines) {
					const data = JSON.parse(line);
					if (data.changedPath.endsWith('.css')) {
						console.log('css changed', data.changedPath);
						const styleSheet = [...document.querySelectorAll("link[rel='stylesheet']")].find(l => new URL(l.href, document.location.href).pathname.endsWith(data.changedPath));
						if (styleSheet) {
							styleSheet.href = styleSheet.href.replace(/\\?.*/, '') + '?' + Date.now();
						}
					} else {
						$sendMessageToParent({ kind: "reload" });
					}
				}
			}
		})
		.catch(err => {
			console.error(err);
			setTimeout($watchChanges, 1000);
		});