// FIXME add GeometryCollection

goog.provide('ol.geom.Geometry');

goog.require('goog.asserts');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('goog.functions');
goog.require('ol.extent');


/**
 * @enum {string}
 */
ol.geom.Type = {
  POINT: 'Point',
  LINE_STRING: 'LineString',
  POLYGON: 'Polygon',
  MULTI_POINT: 'MultiPoint',
  MULTI_LINE_STRING: 'MultiLineString',
  MULTI_POLYGON: 'MultiPolygon'
};


/**
 * @enum {string}
 */
ol.geom.Layout = {
  XY: 'XY',
  XYZ: 'XYZ',
  XYM: 'XYM',
  XYZM: 'XYZM'
};



/**
 * @constructor
 * @extends {goog.events.EventTarget}
 */
ol.geom.Geometry = function() {

  goog.base(this);

  /**
   * @protected
   * @type {ol.geom.Layout}
   */
  this.layout = ol.geom.Layout.XY;

  /**
   * @protected
   * @type {number}
   */
  this.stride = 2;

  /**
   * @protected
   * @type {Array.<number>}
   */
  this.flatCoordinates = [];

  /**
   * @protected
   * @type {number}
   */
  this.revision = 0;

  /**
   * @protected
   * @type {ol.Extent|undefined}
   */
  this.extent = undefined;

  /**
   * @protected
   * @type {number}
   */
  this.extentRevision = -1;

};
goog.inherits(ol.geom.Geometry, goog.events.EventTarget);


/**
 * @param {ol.Coordinate} coordinate Coordinate.
 * @return {boolean} Contains coordinate.
 */
ol.geom.Geometry.prototype.containsCoordinate = function(coordinate) {
  return this.containsXY(coordinate[0], coordinate[1]);
};


/**
 * @param {number} x X.
 * @param {number} y Y.
 * @return {boolean} Contains (x, y).
 */
ol.geom.Geometry.prototype.containsXY = goog.functions.FALSE;


/**
 * FIXME empty description for jsdoc
 */
ol.geom.Geometry.prototype.dispatchChangeEvent = function() {
  ++this.revision;
  this.dispatchEvent(goog.events.EventType.CHANGE);
};


/**
 * @param {ol.Extent=} opt_extent Extent.
 * @return {ol.Extent} extent Extent.
 */
ol.geom.Geometry.prototype.getExtent = function(opt_extent) {
  if (this.extentRevision != this.revision) {
    this.extent = ol.extent.createOrUpdateFromFlatCoordinates(
        this.flatCoordinates, this.stride, this.extent);
    this.extentRevision = this.revision;
  }
  goog.asserts.assert(goog.isDef(this.extent));
  return ol.extent.returnOrUpdate(this.extent, opt_extent);
};


/**
 * @return {Array.<number>} Flat coordinates.
 */
ol.geom.Geometry.prototype.getFlatCoordinates = function() {
  return this.flatCoordinates;
};


/**
 * @return {ol.geom.Layout} Layout.
 */
ol.geom.Geometry.prototype.getLayout = function() {
  return this.layout;
};


/**
 * @return {number} Revision.
 */
ol.geom.Geometry.prototype.getRevision = function() {
  return this.revision;
};


/**
 * @return {number} Stride.
 */
ol.geom.Geometry.prototype.getStride = function() {
  return this.stride;
};


/**
 * @return {ol.geom.Type} Geometry type.
 */
ol.geom.Geometry.prototype.getType = goog.abstractMethod;


/**
 * @param {ol.geom.Layout|undefined} layout Layout.
 * @param {Array} coordinates Coordinates.
 * @param {number} nesting Nesting.
 * @protected
 */
ol.geom.Geometry.prototype.setLayout =
    function(layout, coordinates, nesting) {
  /** @type {number} */
  var stride;
  if (goog.isDef(layout)) {
    if (layout == ol.geom.Layout.XY) {
      stride = 2;
    } else if (layout == ol.geom.Layout.XYZ) {
      stride = 3;
    } else if (layout == ol.geom.Layout.XYM) {
      stride = 3;
    } else if (layout == ol.geom.Layout.XYZM) {
      stride = 4;
    } else {
      throw new Error('unsupported layout: ' + layout);
    }
  } else {
    var i;
    for (i = 0; i < nesting; ++i) {
      if (coordinates.length === 0) {
        this.layout = ol.geom.Layout.XY;
        this.stride = 2;
        return;
      } else {
        coordinates = coordinates[0];
      }
    }
    stride = (/** @type {Array} */ (coordinates)).length;
    if (stride == 2) {
      layout = ol.geom.Layout.XY;
    } else if (stride == 3) {
      layout = ol.geom.Layout.XYZ;
    } else if (stride == 4) {
      layout = ol.geom.Layout.XYZM;
    } else {
      throw new Error('unsupported stride: ' + stride);
    }
  }
  this.layout = layout;
  this.stride = stride;
};


/**
 * @param {ol.TransformFunction} transformFn Transform.
 */
ol.geom.Geometry.prototype.transform = function(transformFn) {
  transformFn(this.flatCoordinates, this.flatCoordinates, this.stride);
};


/**
 * @typedef {ol.Coordinate}
 */
ol.geom.RawPoint;


/**
 * @typedef {Array.<ol.Coordinate>}
 */
ol.geom.RawLineString;


/**
 * @typedef {Array.<ol.Coordinate>}
 *
 */
ol.geom.RawLinearRing;


/**
 * @typedef {Array.<ol.geom.RawLinearRing>}
 */
ol.geom.RawPolygon;


/**
 * @typedef {Array.<ol.geom.RawPoint>}
 */
ol.geom.RawMultiPoint;


/**
 * @typedef {Array.<ol.geom.RawLineString>}
 */
ol.geom.RawMultiLineString;


/**
 * @typedef {Array.<ol.geom.RawPolygon>}
 */
ol.geom.RawMultiPolygon;


/**
 * @param {Array.<number>} flatCoordinates Flat coordinates.
 * @param {number} offset Offset.
 * @param {number} end End.
 * @param {number} stride Stride.
 * @param {number} x X.
 * @param {number} y Y.
 * @return {boolean} Contains (x, y).
 */
ol.geom.flatLinearRingContainsXY =
    function(flatCoordinates, offset, end, stride, x, y) {
  // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
  var contains = false;
  var xi = flatCoordinates[offset];
  var yi = flatCoordinates[offset + 1];
  for (offset += stride; offset < end; offset += stride) {
    var xj = flatCoordinates[offset];
    var yj = flatCoordinates[offset + 1];
    var intersect = ((yi > y) != (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) {
      contains = !contains;
    }
    xi = xj;
    yi = yj;
  }
  return contains;
};


/**
 * @param {Array.<number>} flatCoordinates Flat coordinates.
 * @param {number} offset Offset.
 * @param {number} end End.
 * @param {number} stride Stride.
 * @return {boolean} Is clockwise.
 */
ol.geom.flatLinearRingIsClockwise =
    function(flatCoordinates, offset, end, stride) {
  // http://tinyurl.com/clockwise-method
  // https://github.com/OSGeo/gdal/blob/trunk/gdal/ogr/ogrlinearring.cpp
  var edge = 0;
  var x1 = flatCoordinates[end - stride];
  var y1 = flatCoordinates[end - stride + 1];
  for (; offset < end; offset += stride) {
    var x2 = flatCoordinates[offset];
    var y2 = flatCoordinates[offset + 1];
    edge += (x2 - x1) * (y2 + y1);
    x1 = x2;
    y1 = y2;
  }
  return edge > 0;
};


/**
 * @param {Array.<number>} flatCoordinates Flat coordinates.
 * @param {number} offset Offset.
 * @param {Array.<number>} ends Ends.
 * @param {number} stride Stride.
 * @param {number} x X.
 * @param {number} y Y.
 * @return {boolean} Contains (x, y).
 */
ol.geom.flatLinearRingsContainsXY =
    function(flatCoordinates, offset, ends, stride, x, y) {
  goog.asserts.assert(ends.length > 0);
  if (ends.length === 0) {
    return false;
  }
  if (!ol.geom.flatLinearRingContainsXY(
      flatCoordinates, offset, ends[0], stride, x, y)) {
    return false;
  }
  var i, ii;
  for (i = 1, ii = ends.length; i < ii; ++i) {
    if (ol.geom.flatLinearRingContainsXY(
        flatCoordinates, ends[i - 1], ends[i], stride, x, y)) {
      return false;
    }
  }
  return true;
};


/**
 * @param {Array.<number>} flatCoordinates Flat coordinates.
 * @param {number} offset Offset.
 * @param {Array.<Array.<number>>} endss Endss.
 * @param {number} stride Stride.
 * @param {number} x X.
 * @param {number} y Y.
 * @return {boolean} Contains (x, y).
 */
ol.geom.flatLinearRingssContainsXY =
    function(flatCoordinates, offset, endss, stride, x, y) {
  goog.asserts.assert(endss.length > 0);
  if (endss.length === 0) {
    return false;
  }
  var i, ii;
  for (i = 0, ii = endss.length; i < ii; ++i) {
    var ends = endss[i];
    if (ol.geom.flatLinearRingsContainsXY(
        flatCoordinates, offset, ends, stride, x, y)) {
      return true;
    }
    offset = ends[ends.length - 1];
  }
  return false;
};


/**
 * @param {Array.<number>} flatCoordinates Flat coordinates.
 * @param {number} offset Offset.
 * @param {Array.<number>} ends Ends.
 * @param {number} stride Stride.
 * @return {number} End.
 */
ol.geom.orientFlatLinearRings =
    function(flatCoordinates, offset, ends, stride) {
  var i, ii;
  for (i = 0, ii = ends.length; i < ii; ++i) {
    var end = ends[i];
    var isClockwise = ol.geom.flatLinearRingIsClockwise(
        flatCoordinates, offset, end, stride);
    var reverse = i === 0 ? !isClockwise : isClockwise;
    if (reverse) {
      ol.geom.reverseFlatCoordinates(flatCoordinates, offset, end, stride);
    }
    offset = end;
  }
  return offset;
};


/**
 * @param {Array.<number>} flatCoordinates Flat coordinates.
 * @param {number} offset Offset.
 * @param {Array.<Array.<number>>} endss Endss.
 * @param {number} stride Stride.
 * @return {number} End.
 */
ol.geom.orientFlatLinearRingss =
    function(flatCoordinates, offset, endss, stride) {
  var i, ii;
  for (i = 0, ii = endss.length; i < ii; ++i) {
    offset = ol.geom.orientFlatLinearRings(
        flatCoordinates, offset, endss[i], stride);
  }
  return offset;
};


/**
 * @param {Array.<number>} flatCoordinates Flat coordinates.
 * @param {number} offset Offset.
 * @param {number} end End.
 * @param {number} stride Stride.
 */
ol.geom.reverseFlatCoordinates =
    function(flatCoordinates, offset, end, stride) {
  while (offset < end - stride) {
    var i;
    for (i = 0; i < stride; ++i) {
      var tmp = flatCoordinates[offset + i];
      flatCoordinates[offset + i] = flatCoordinates[end - stride + i];
      flatCoordinates[end - stride + i] = tmp;
    }
    offset += stride;
    end -= stride;
  }
};
