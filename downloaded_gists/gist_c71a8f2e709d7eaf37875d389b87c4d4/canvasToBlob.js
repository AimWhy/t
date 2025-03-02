export function canvasToBlob( canvas, callback, type, quality ) {
	const { HTMLCanvasElement, Blob, atob } = window;

	if ( ! HTMLCanvasElement.prototype.toBlob ) {
		Object.defineProperty( HTMLCanvasElement.prototype, 'toBlob', {
			value: function ( polyfillCallback, polyfillType, polyfillQuality ) {
				const binStr = atob( this.toDataURL( polyfillType, polyfillQuality ).split( ',' )[ 1 ] );
				const len = binStr.length;
				const arr = new Uint8Array( len );

				for ( let i = 0; i < len; i++ ) {
					arr[ i ] = binStr.charCodeAt( i );
				}

				polyfillCallback(
					new Blob( [ arr ], {
						type: polyfillType || 'image/png',
					} )
				);
			},
		} );
	}

	canvas.toBlob( callback, type, quality );
}