/**
 * @name window.Animator
 * @description Animates dom elements via a rAF
 * @author <a href='mailto:adriaan.scholvinck@AKQA.com'>Adriaan Scholvinck</a>
 */


window.Animator = (function(animation){

	 /**
	 * @description holds scope
	 * @name root
	 * @constant
	 */
	var root = this,
	/**
	 * @description 
	 * @name scrollTop
	 */
	scrollTop = 0,
	/**
	 * @description 
	 * @name scrollTopTweened
	 */
	scrollTopTweened = 0,
	/**
	 * @description determines whether or not the plugin has been initialized or not
	 * @name started
	 */
	started = false,
	/**
	 * @description 
	 * @name touchStart
	 */
	touchStart = {},
	/**
	 * @description 
	 * @name scrollStart
	 */
	scrollStart = 0,
	/**
	 * @description 
	 * @name subscribers
	 */
	subscribers = [],
	/**
	 * @description 
	 * @name settings
	 */
	settings = {
		useRAF: true,
		tweenSpeed: 0.3,
		startAt: 0
	};

/**
 * @description setup start positions, create references to container elements
 * @name setupAnimation
 * @private
 * @function
 */
	var setupAnimation = function() {

		for (var i in subscribers) {
			var anim = subscribers[i];

			// grab dom element
			if (anim._elem == undefined) {
				anim._elem = document.getElementById(anim.id);
			}

			// iterate through onKeyframes
			for (var k in anim.onKeyframes) {
				var keyframe = anim.onKeyframes[k];

				// onInit callback
				if (keyframe.onInit && typeof keyframe.onInit == 'function') {
					keyframe.onInit( anim );
				}
				// ToDo this could alternatively be an object that references a function inside this closure

				// setup keyframe 0
				if (keyframe.position == 0) {
					var nKeyframe = anim.onKeyframes[Number(k)+1];	// next keyframe

					applyStyle( anim._elem, keyframe.properties );

					for (property in nKeyframe.properties) {
						if (keyframe.properties[ property ] == undefined) {
							// grab current offset and load into properties for keyframe 0
							// if (/left|top/.test(property)) {
								keyframe.properties[ property ] = anim._elem.position()[ property ];
							// }
							// todo: width & height
						}
					}
				}

				// fill in properties from current element
				// find missing properties from last occurance of property
				var bIndex = Number(k); // start 1 back from current

				while (bIndex > 0) {
					var bKeyframe = anim.onKeyframes[ bIndex ];

					for (var property in bKeyframe.properties)
						if ( keyframe.properties[ property ] == undefined)
							keyframe.properties[ property ] = bKeyframe.properties[ property ];

					bIndex--;
				};
			}
		}
	}

/**
 * @description a native JavaScript helper function that applies properties to a Dom Element
 * @name applyStyle
 * @private
 * @function
 */
	var applyStyle = function( elem, properties ) {

		for ( var prop in properties ) {
			console.log( prop, properties[prop] );
			elem.style[prop] = properties[prop] + 'px';
		}
	}
/**
 * @description a native JavaScript helper function that combines two objects together
 * @name extend
 * @private
 * @function
 */
	var extend = function() {
		for(var i=1; i<arguments.length; i++)
			for(var key in arguments[i])
				if(arguments[i].hasOwnProperty(key))
					arguments[0][key] = arguments[i][key];
		return arguments[0];
	}
/**
 * @description resets all animators by removing the reference element and it's corresponding scroll region* 
 * @name resetAnimation
 * @private
 * @function
 */
	var resetAnimation = function() {
		for (var i in subscribers) {
			var anim = subscribers[i];
			if (anim._started) {
				delete anim.startAt;
				delete anim.endAt;
				delete anim._elem;
				delete anim._started;
			}
		}
	}
/**
 * @description cycles through each animator and checks if the scroll position is in the corresponding region, then animates accordingly
 * @name animationLoop
 * @private
 * @function
 */
	var animationLoop = function() {
		requestAnimationFrame( animationLoop );
		if (Math.floor(scrollTopTweened) !== Math.floor(scrollTop)) {
			// smooth out scrolling action
			scrollTopTweened += Math.round(settings.tweenSpeed * (scrollTop - scrollTopTweened) * 100) / 100;
			// run through all animators
			for (var i in subscribers) {
				var anim = subscribers[i];

		
				// check if animator is in range
				if (scrollTopTweened >= anim.startAt && scrollTopTweened <= anim.endAt) {
					console.log ( scrollTopTweened, anim.startAt, anim.endAt );
					// startAnimatable( anim );
					render( anim );
				} else {
					// stopAnimatable( anim );
				}
			}

			// onAnimate callback
			//if (typeof settings.onUpdate === 'function') settings.onUpdate();
		};
	}
/**
 * @description moves through each keyframe of the animator, preparing each property
 * @name render
 * @function
 * @private
 * @param {Object} anim - element that has animator properties
 */
	var render = function( anim ) {
		// figure out where we are within the scroll
		var progress = Math.round((anim.startAt - scrollTopTweened) / (anim.startAt - anim.endAt) * 100) / 100;


		console.log ( 'progress', progress, scrollTopTweened );

		var properties = {};

		// check and run onKeyframes within scroll range
		if (anim.onKeyframes) {
			for ( i = 1; i < anim.onKeyframes.length; i++ ) {
				var keyframe = anim.onKeyframes[ i ],
					lastkeyframe = anim.onKeyframes[ i - 1 ],
					keyframeProgress = Math.round(( lastkeyframe.position - progress ) / ( lastkeyframe.position - keyframe.position ) * 100) / 100;

					// console.log ( 'keyframeProgress', keyframeProgress );

				if ( keyframeProgress > 0 && keyframeProgress <= 1 ) {
					// if something is happening during the course of the animator
					if (keyframe.onProgress && typeof keyframe.onProgress === 'function') {
						keyframe.onProgress( keyframeProgress );
					};

					// css attributes to adjust
					for ( property in keyframe.properties ) {
						var t = Math.round( calc ( 'getTweenedValue', {start:lastkeyframe.properties[property], end:keyframe.properties[property], currentTime: keyframeProgress, totalTime:1, tweener:keyframe.ease} ) );
						properties[ property ] = t;
					}
				}
			}
		}

		// apply styles
		applyStyle( anim._elem, properties );

		if (anim.onProgress && typeof anim.onProgress === 'function') {
			anim.onProgress( anim, progress );
		} else if (anim.onProgress && typeof anim.onProgress === 'object') {
			calc( anim.onProgress.func, extend( anim.onProgress.opt, {end:progress} ) );
		}
	}
/**
 * @description run before animator starts when animator is in range
 * @name startAnimatable
 * @private
 * @param {Object} anim - element that has animator properties
 */
	var startAnimatable = function( anim ) {
		// apply start properties
		if (!anim._started) {
			if (anim.onStartAnimate && typeof anim.onStartAnimate === 'function') {
				anim.onStartAnimate.call( anim );
			} else {
				applyStyle( anim._elem, {'display':'block'});
			}
			anim._started = true;

		}
	}
/**
 * @description run after animator is out of range
 * @name stopAnimatable
 * @private
 * @param {Object} anim - element that has animator properties
 */
	var stopAnimatable = function( anim ) {
		// apply end properties
		if (anim._started && anim.endAt < scrollTopTweened || anim._started && anim.startAt > scrollTopTweened ) {
			if (anim.onEndAnimate && typeof anim.onEndAnimate === 'function') {
				anim.onEndAnimate.call( anim );
			} else {
				// hide it when it's not in view
				applyStyle( anim._elem, {'display':'none'});
			}

			anim._started = false;
		}
	}
/**
 * @description public function for scrolling to a specific point
 * @name root.scrollTo
 * @public
 * @param {Number} scroll - new position to scroll to
 */
	root.scrollTo = function() {
		scrollTop = document.body.scrollTop;
	};
/**
 * @description touch handler on start
 * @name touchStartHandler
 * @private
 * @param {Object} e - touch event
 */
	var touchStartHandler = function(e) {
		//e.preventDefault();
		touchStart.x = e.originalEvent.touches[0].pageX;
		// Store the position of finger on swipe begin:
		touchStart.y = e.originalEvent.touches[0].pageY;
		// Store scroll val on swipe begin:
		scrollStart = scrollTop;
	};
/**
 * @description touch handler on end
 * @name touchEndHandler
 * @private
 * @param {Object} e - touch event
 */
	var touchEndHandler = function(e) {
	}
/**
 * @description touch handler on move
 * @name touchMoveHandler
 * @private
 * @param {Object} e - touch event
 */
	var touchMoveHandler = function(e) {
		e.preventDefault();
		offset = {};
		offset.x = touchStart.x - e.originalEvent.touches[0].pageX;
		// Get distance finger has moved since swipe begin:
		offset.y = touchStart.y - e.originalEvent.touches[0].pageY;
		// Add finger move dist to original scroll value
		scrollTop = Math.max(0, scrollStart + offset.y);
	}
/**
 * @description sets the width, height, and center object constant values
 * @name resize
 * @private
 */
	var resize = function() {
		/*
		 * @description check to determine if the scroll isn't out of the maximum scrollable region
		 */

		windowWidth = window.innerWidth;
		windowHeight = window.innerHeight;
		windowCenter = { left: windowHeight/2, top: windowWidth/2 };
		if (settings.onResize && typeof settings.onResize === 'function') settings.onResize();
		resetAnimation();
		setupAnimation();
	};

/**
 * @description 
 * @name root.calcBgY
 * 
 * @public
 * @param {Number} x -
 * @param {Number} windowHeight -
 * @param {Number} pos -
 * @param {Number} adjuster -
 * @param {Number} inertia -
 *
 * @return
 */
	root.calcBgY = function(x, windowHeight, pos, adjuster, inertia){
		return x + "px, " + (-((windowHeight + pos) - adjuster) * inertia)  + "px";
	};
/**
 * @description 
 * @name root.calcBgX
 * 
 * @public
 * @param y (number) -
 * @param {Number} windowHeight -
 * @param {Number} pos -
 * @param {Number} adjuster -
 * @param {Number} inertia -
 *
 * @return
 */
	root.calcBgX = function(y, windowHeight, pos, adjuster, inertia){
		return (-((windowHeight + pos) - adjuster) * inertia)  + "px " + y + "px";
	};
/**
 * @description 
 * @name root.calcXY
 * 
 * @public
 * @param {Number} windowHeight -
 * @param {Number} pos -
 * @param {Number} adjusterX -
 * @param {Number} inertiaX -
 * @param {Number} adjusterY -
 * @param {Number} inertiaY -
 *
 * @return
 */
	root.calcXY = function(windowHeight, pos, adjusterX, inertiaX, adjusterY, inertiaY){
		return (-((windowHeight + pos) - adjusterX) * inertiaX)  + "px " + (-((windowHeight + pos) - adjusterY) * inertiaY) + "px";
	};
/**
 * @description 
 * @name root.calcPos
 * 
 * @public
 * @param {Number} windowHeight -
 * @param {Number} pos -
 * @param {Number} adjuster -
 * @param {Number} inertia -
 *
 * @return
 */
	root.calcPos = function(windowHeight, pos, adjuster, inertia) {
		return (((windowHeight + pos) - adjuster) * inertia)  + "px";
	};
/**
 * @description 
 * @name root.calcRot
 * 
 * @public
 * @param r (number) - 
 * @param {Number} windowHeight -
 * @param {Number} pos -
 * @param {Number} adjuster -
 * @param {Number} inertia -
 *
 * @return
 */
	root.calcRot = function( r, windowHeight, pos, adjuster, inertia ){
		return (r + -(((windowHeight + pos) - adjuster ) * inertia));
	};
/**
 * @description 
 * @name root.calcProgress
 * 
 * @public
 * @param {Number} startAt - 
 * @param {Number} endAt - 
 * @param {Number} scrollTop - 
 *
 * @return
 */
	root.calcProgress = function( startAt, endAt, scrollTop ) {
		return ( (startAt - scrollTop) / (startAt - endAt) );
	};
/**
 * @description 
 * @name root.calcDegrees2Radians
 * 
 * @public
 * @param {Number} degrees - 
 *
 * @return
 */
	root.calcDegrees2Radians = function( degrees ) {
		return ( degrees * Math.PI / 180 );
	};
/**
 * @description resize image but conform on aspect ratio
 * @name root.imageResize
 * 
 * @public
 * @param {Element} img -
 * @param {Number} w -
 * @param {Number} h -
 *
 * @return the image reference but resized
 */
	root.imageResize = function( img, w, h ) {
		img.width( w );
		img.height( Math.round ( w * root.settings.ratio ) );
		if ( img.height() < h ) {
			img.height( h );
			img.width( Math.round ( h / root.settings.ratio ) );
		}
		return img;
	};
/**
 * @description 
 * @name root.getTweenedValue
 * 
 * @public
 * @param {Number} start -
 * @param {Number} end -
 * @param {Number} currentTime -
 * @param {Number} totalTime -
 * @param {Function} tweener -
 * 
 * @return value based on progress along tween 
 */
	root.getTweenedValue = function( o ) {
		// start, end, currentTime, totalTime, tweener
		var delta = o.end - o.start;
		var percentComplete = (o.currentTime/o.totalTime);
		console.log ( 'percentComplete', percentComplete, o.currentTime, o.totalTime );
		if (!o.tweener) o.tweener = TWEEN.Easing.Linear.EaseNone;
		return o.tweener(percentComplete) * delta + o.start
	};
/**
 * @description a position at 0,0
 * @name root.absPosition
 * 
 * @public
 * @param {Object} opts - options
 */
	root.absPosition = function(opts) {
		var defaults = {startLeft: 0,
				startTop: 0,
				endLeft: 0,
				endTop: 0},
		settings = extend( defaults, opts );
		this.startProperties['left'] = settings.startLeft;
		this.startProperties['top'] = settings.startTop;
		this.endProperties['left'] = settings.endLeft;
		this.endProperties['top'] = settings.endTop;
		this.startProperties['display'] = 'block';
		this.endProperties['display'] = 'none';
	};
/**
 * @description an algorithm that positions an item to the BOTTOM LEFT OUTSIDE of the viewportdescription 
 * @name root.bottomLeftOutside
 * 
 * @public
 * @param {Object} opts -
 */
	root.bottomLeftOutside = function( opts ) {
		var defaults = {offset:0}, settings = extend( defaults, opts );
		resize();
		var portrait = false, //windowHeight > windowWidth ? true : false,
			elemHalfWidth = settings.anim._elem.width()/2,
			elemHalfHeight = settings.anim._elem.height()/2,
			adj = portrait ? windowWidth/2 + elemHalfWidth : adj = windowHeight/2 + elemHalfHeight,
			tan = Math.sqrt( Math.pow( adj, 2) + Math.pow( adj, 2) );

		settings.keyframe.properties['top'] = windowCenter.top + adj - elemHalfHeight + (portrait ? settings.offset : 0);
		settings.keyframe.properties['left'] = windowCenter.left - adj - elemHalfWidth + (portrait ? 0 : settings.offset);
	};
/**
 * @description an algorithm that positions an item to the TOP RIGHT OUTSIDE of the viewportdescription 
 * @name root.topRightOutside
 * 
 * @public
 * @param {Object} opts -
 */
	root.topRightOutside =function( opts ) {
		var defaults = {offset:0}, settings = extend( defaults, opts );
		var portrait = false, //windowHeight > windowWidth ? true : false,
			elemHalfWidth = settings.anim._elem.width()/2,
			elemHalfHeight = settings.anim._elem.height()/2,
			adj = portrait ? windowWidth/2 + elemHalfWidth : adj = windowHeight/2 + elemHalfHeight,
			tan = Math.sqrt( Math.pow( adj, 2) + Math.pow( adj, 2) );

		settings.keyframe.properties['top'] = windowCenter.top - adj - elemHalfHeight + (portrait ? settings.offset : 0);
		settings.keyframe.properties['left'] = windowCenter.left + adj - elemHalfWidth + (portrait ? 0 : settings.offset);
	};
/**
 * @description an algorithm that positions an item to the LEFT OUTSIDE of the viewport
 * @name root.leftOutside
 * 
 * @public
 * @param {Object} opts - animator settings
 */
	root.leftOutside = function( opts ) {
		var defaults = {offset:0}, settings = extend( defaults, opts );
		settings.keyframe.properties['left'] = -settings.anim._elem.width() + settings.offset;
	};
/**
 * @description an algorithm that positions an item to the RIGHT OUTSIDE of the viewport
 * @name root.rightOuside
 * 
 * @public
 * @param {Object} opts -
 */
	root.rightOutside = function( opts ) {
		var defaults = {offset:0}, settings = extend( defaults, opts );
		settings.keyframe.properties['left'] = windowWidth + settings.offset;
	};
/**
 * @description an algorithm that centers an item on the screen VERTICALLY
 * @name root.centerV
 * 
 * @public
 * @param {Object} opts -
 */
	root.centerV = function( opts ) {
		var defaults = {offset:0}, settings = extend( defaults, opts );
		var elemHalfHeight = settings.anim._elem.height()/2;
		settings.keyframe.properties['top'] = windowCenter.top - elemHalfHeight + settings.offset;
	};
/**
 * @description an algorithm that centers an item on the screen HORIZONTALLY
 * @name root.centerH
 * 
 * @public
 * @param {Object} opts -
 */
	root.centerH = function( opts ) {
		var defaults = {offset:0}, settings = extend( defaults, opts );
		var elemHalfWidth = settings.anim._elem.width()/2;
		settings.keyframe.properties['left'] = windowCenter.left - elemHalfWidth + settings.offset;
	};
/**
 * @description 
 * @name root.bottomOutside
 * 
 * @public
 * @param {Object} opts -
 */
	root.bottomOutside = function( opts ) {
		var defaults = {offset:0}, settings = extend( defaults, opts );
		settings.keyframe.properties['top'] = windowHeight + settings.offset;
	};
/**
 * @description 
 * @name root.bottomOutsideAnim
 * 
 * @public
 * @param {Object} opts -
 */
	root.bottomOutsideAnim = function( opts) {
		var defaults = {offset:0}, settings = extend( defaults, opts );
		settings.keyframe.properties['top'] = anim.endAt + settings.offset;
	};
/**
 * @description 
 * @name root.bottomInside
 * 
 * @public
 * @param {Object} opts -
 */
	root.bottomInside = function( opts ) {
		var defaults = {offset:0}, settings = extend( defaults, opts );
		settings.keyframe.properties['top'] = windowHeight - settings.offset;
	};
/**
 * @description 
 * @name root.topOutside
 * 
 * @public
 * @param {Object} opts - 
 */
	root.topOutside = function( opts ) {
		var defaults = {offset:0}, settings = extend( defaults, opts );
		settings.keyframe.properties['top'] = -settings.anim._elem.height() + settings.offset;
	};
/**
 * @description 
 * @name root.zeroTop
 * 
 * @public
 * @param {Object} opts - 
 */
	root.zeroTop = function( opts ) {
		var defaults = {offset:0}, settings = extend( defaults, opts );
		settings.keyframe.properties['top'] = 0 + settings.offset;
	};
/**
 * @description 
 * @name root.zeroLeft
 * 
 * @public
 * @param {Object} opts - 
 */
	root.zeroLeft = function( opts ) {
		var defaults = {offset:0}, settings = extend( defaults, opts );
		settings.keyframe.properties['left'] = 0 + settings.offset;
	};
/**
 * @description slides a container to the left based on a scroll position
 * @name root.gallery_template
 * 
 * @public
 * @param {Number} scrollY - 
 */
	root.gallery_translate = function( scrollY ) {
		limitX = (root.settings.itemWidth - endX + 130 );
		limitY = (endY - root.settings.itemHeight);
		if ( scrollY < root.settings.endAt && scrollY > root.settings.startAt ){
			endX = root.settings.totalImagesWidth;
			endY = $target.height();

			cur_time = ( scrollY - root.settings.startAt ) ;
			tot_time = ( root.settings.endAt - root.settings.startAt );

			valX = calc( 'getTweenedValue', {start: startX, end:endX, currentTime:cur_time, totalTime:tot_time} ) * -1;
			valY = calc( 'getTweenedValue', {start:startY, end:endY, currentTime:cur_time, totalTime:tot_time} );

			if ( valX < limitX ){
				valX = limitX;
			}
			if ( valY > limitY ){
				valY = limitY;
			}

		} else if ( scrollY < root.settings.startAt ) {
			valX = 0;
			valY = 0;
		} else if ( scrollY > root.settings.endAt ) {
			valX = limitX;
			valY = limitY;
		}

		settings.keyframe.properties['top'] = valY;
		settings.keyframe.properties['left'] = valX;

		// var properties = {
		// 	'transform': "translate("+valX+"px,"+valY+"px)",
		// 	'-ms-transform': "translate("+valX+"px,"+valY+"px)", /* IE 9 */
		// 	'-webkit-transform': "translate("+valX+"px,"+valY+"px)",  Safari and Chrome
		// 	'-o-transform': "translate("+valX+"px,"+valY+"px)", /* Opera */
		// 	'-moz-transform': "translate("+valX+"px,"+valY+"px)" /* Firefox */
		// };

		// this.properties = properties;
	};
/**
 * @description shows and hides an image of a sequence of images
 * @name root.sequence
 * 
 * @public
 * @param {Number} opts - 
 */
	root.sequence = function( opts ) {
		var defaults = {offset:0}, settings = extend( defaults, opts );
		var progress = settings.end;
		var elem = settings.elem;
		var endFrame = (elem.children.length),
		toFrame = Math.floor(progress*endFrame) % endFrame;
		var i = (elem.children.length-1);
		// clear classes from all elements
		while ( i>=0 ){
			elem.children[i].classList.remove('show');
			i--;
		}
		// add class to the element in the sequence you want to show
		elem.children[toFrame].classList.add('show');
	};

/**
 * @description 
 * @name calc
 * @return {function} 
 */
	var calc = function( f, o )
	{
		return root[f](o);
	};
/**
 * @description adds animation objects to a subscriber array
 * @name root.subscribe
 * @param {object} anim - an animation object
 * @see Animation Object
 */
	root.subscribe = function( anim ) {
		if( Object.prototype.toString.call( anim ) === '[object Array]' ) {
			subscribers = subscribers.concat( anim );
		} else if ( typeof anim === 'object' ) {
			subscribers.push( anim );	
		}
	};

/**
 * @description pollyfill for RequestAnimationFrame
 * @name requestAnimationFrame
 * @see Paul Irish
 */
	var lastTime = 0;
	var vendors = ['ms', 'moz', 'webkit', 'o'];
	for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
		window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
		window.cancelAnimationFrame =
		window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
	}

	if (!window.requestAnimationFrame)
		window.requestAnimationFrame = function(callback, element) {
			var currTime = new Date().getTime();
			var timeToCall = Math.max(0, 16 - (currTime - lastTime));
			var id = window.setTimeout(function() { callback(currTime + timeToCall); },
			  timeToCall);
			lastTime = currTime + timeToCall;
			return id;
		};

	if (!window.cancelAnimationFrame)
		window.cancelAnimationFrame = function(id) {
			clearTimeout(id);
		};

/**
 * @constructor
 */
	if ( subscribers.length === 0 ){
		window.addEventListener( 'scroll', root.scrollTo );
		//$scrubber.on ( 'mousedown', mousedown );
		window.addEventListener ( 'resize', resize );
		if ( 'ontouchstart' in window ) {
			window.addEventListener('touchstart', touchStartHandler);
			window.addEventListener('touchmove', touchMoveHandler);
			window.addEventListener('touchend', touchEndHandler);
		}

		// make sure it's not equal to scrollTopTweened
		if ( scrollTopTweened === null || scrollTopTweened === undefined || scrollTop === undefined || scrollTop === null ) {
			scrollTopTweened = scrollTop = 0;
		}

		scrollTop++;
	}

	root.subscribe( animation );
	
	resize();

	if (!started) {
		animationLoop();
		started=true;
	};

	// callback onStart
	if (settings.onStart && typeof settings.onStart === 'function') {
		settings.onStart();
	}
	
});
