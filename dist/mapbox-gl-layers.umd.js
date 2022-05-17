(function(u,f){typeof exports=="object"&&typeof module!="undefined"?f(exports,require("proj4"),require("echarts")):typeof define=="function"&&define.amd?define(["exports","proj4","echarts"],f):(u=typeof globalThis!="undefined"?globalThis:u||self,f(u.MapboxGLLayers={},u.proj4,u.echarts))})(this,function(u,f,A){"use strict";function R(o){return o&&typeof o=="object"&&"default"in o?o:{default:o}}function S(o){if(o&&o.__esModule)return o;var e=Object.create(null,{[Symbol.toStringTag]:{value:"Module"}});return o&&Object.keys(o).forEach(function(t){if(t!=="default"){var r=Object.getOwnPropertyDescriptor(o,t);Object.defineProperty(e,t,r.get?r:{enumerable:!0,get:function(){return o[t]}})}}),e.default=o,Object.freeze(e)}var v=R(f),T=S(A);class y{constructor(e=[],t=b){if(this.data=e,this.length=this.data.length,this.compare=t,this.length>0)for(let r=(this.length>>1)-1;r>=0;r--)this._down(r)}push(e){this.data.push(e),this.length++,this._up(this.length-1)}pop(){if(this.length===0)return;const e=this.data[0],t=this.data.pop();return this.length--,this.length>0&&(this.data[0]=t,this._down(0)),e}peek(){return this.data[0]}_up(e){const{data:t,compare:r}=this,n=t[e];for(;e>0;){const i=e-1>>1,s=t[i];if(r(n,s)>=0)break;t[e]=s,e=i}t[e]=n}_down(e){const{data:t,compare:r}=this,n=this.length>>1,i=t[e];for(;e<n;){let s=(e<<1)+1,a=t[s];const h=s+1;if(h<this.length&&r(t[h],a)<0&&(s=h,a=t[h]),r(a,i)>=0)break;t[e]=a,e=s}t[e]=i}}function b(o,e){return o<e?-1:o>e?1:0}class x{constructor(e,t,r,n){this._projector=e,this._verts=t,this._uv=r,this._projVerts=t.map(e),this._trigs=n,this._segs=[],this._segCount=0,this._segTrigs=[],this._epsilons=[],this._queue=new y([],function(i,s){return s.epsilon-i.epsilon}),this._vertToSeg=new Array(t.length);for(let i in this._verts)this._vertToSeg[i]=[];for(let i in this._trigs){let s=this._trigs[i],a=s[0],h=s[1],_=s[2];this._segment(a,h,i),this._segment(h,_,i),this._segment(_,a,i)}}_segment(e,t,r){if(this._vertToSeg[e]&&this._vertToSeg[e][t]!==void 0){const _=this._vertToSeg[e][t];return this._segTrigs[_].includes(r)||this._segTrigs[_].push(r),_}const n=this._segCount++;this._segs[n]=[e,t],this._vertToSeg[e][t]=n,this._vertToSeg[t][e]=n,this._segTrigs[n]=[r];const i=[(this._verts[e][0]+this._verts[t][0])/2,(this._verts[e][1]+this._verts[t][1])/2],s=this._projector(i),a=[(this._projVerts[e][0]+this._projVerts[t][0])/2,(this._projVerts[e][1]+this._projVerts[t][1])/2],h=(s[0]-a[0])**2+(s[1]-a[1])**2;return this._queue.push({v1:e,v2:t,epsilon:h,midpoint:i,projectedMid:s}),n}output(){return{unprojected:Array.from(this._verts),projected:Array.from(this._projVerts),uv:Array.from(this._uv),trigs:Array.from(this._trigs)}}lowerEpsilon(e){for(;this._queue.peek().epsilon>e;)this.step()}step(){const e=this._queue.pop(),t=e.v1,r=e.v2,n=this._vertToSeg[t]&&this._vertToSeg[t][r],i=this._segTrigs[n];if(i.length>=3)throw new Error("Somehow a segment is shared by three triangles");delete this._segTrigs[n],delete this._segs[n],delete this._vertToSeg[t][r],delete this._vertToSeg[r][t];const s=this._verts.length;this._projVerts[s]=e.projectedMid,this._verts[s]=e.midpoint,this._vertToSeg[s]=[],this._uv[s]=[(this._uv[t][0]+this._uv[r][0])/2,(this._uv[t][1]+this._uv[r][1])/2];for(let a of i)this._splitTriangle(t,r,s,a)}_splitTriangle(e,t,r,n){const i=this._trigs[n];let s,a=!1;if(i[0]===e&&i[1]===t)s=i[2],a=!0;else if(i[1]===e&&i[2]===t)s=i[0],a=!0;else if(i[2]===e&&i[0]===t)s=i[1],a=!0;else if(i[1]===e&&i[0]===t)s=i[2],a=!1;else if(i[2]===e&&i[1]===t)s=i[0],a=!1;else if(i[0]===e&&i[2]===t)s=i[1],a=!1;else throw new Error("Data structure mishap: could not fetch 3rd vertex used in triangle");const h=this._trigs.length;a?(this._trigs[n]=[e,r,s],this._trigs[h]=[r,t,s]):(this._trigs[n]=[r,e,s],this._trigs[h]=[t,r,s]);const _=this._vertToSeg[e]&&this._vertToSeg[e][t],d=this._vertToSeg[t]&&this._vertToSeg[t][s],c=this._vertToSeg[s]&&this._vertToSeg[s][e];function p(l){return l!==n}_!==void 0&&(this._segTrigs[_]=this._segTrigs[_].filter(p)),d!==void 0&&(this._segTrigs[d]=this._segTrigs[d].filter(p)),c!==void 0&&(this._segTrigs[c]=this._segTrigs[c].filter(p)),this._segment(e,r,n),this._segment(r,s,n),this._segment(s,e,n),this._segment(t,r,h),this._segment(r,s,h),this._segment(s,t,h)}}function B(o){return new Promise((e,t)=>{const r=new Image;r.src=o,r.onload=function(){e(r)},r.onerror=function(){t("error")}})}function g(o,e,t){const r=o.createShader(e);if(r==null)return console.log("unable to create shader"),null;if(o.shaderSource(r,t),o.compileShader(r),!o.getShaderParameter(r,o.COMPILE_STATUS)){const i=o.getShaderInfoLog(r);return console.log("Failed to compile shader: "+i),o.deleteShader(r),null}return r}function L(o,e,t){const r=g(o,o.VERTEX_SHADER,e),n=g(o,o.FRAGMENT_SHADER,t);if(!r||!n)return null;const i=o.createProgram();if(!i)return null;if(o.attachShader(i,r),o.attachShader(i,n),o.linkProgram(i),!o.getProgramParameter(i,o.LINK_STATUS)){const a=o.getProgramInfoLog(i);return console.log("Failed to link program: "+a),o.deleteProgram(i),o.deleteShader(n),o.deleteShader(r),null}return i}class F{constructor(e,t){this.id=e,this.type="custom",this.renderingMode="2d",this._option=t,this._loaded=!1;const{projection:r,coordinates:n}=t,i=this._initArrugator(r,n);this._arrugado={pos:i.projected.flat(),uv:i.uv.flat(),trigs:i.trigs.flat()},this._map=null,this._gl=null,this._program=null,this._texture=null,this._positionBuffer=null,this._uvBuffer=null,this._verticesIndexBuffer=null}onAdd(e,t){this._map=e,this._gl=t,this._loadImage(e,t);const r=`
      uniform mat4 u_matrix;
      attribute vec2 a_pos;
      attribute vec2 a_uv;
      varying vec2 v_uv;
      void main() {
        gl_Position = u_matrix * vec4(a_pos, 0.0, 1.0);
        v_uv = a_uv;
      }`,n=`
      #ifdef GL_ES
        precision highp int;
        precision mediump float;
      #endif
      uniform sampler2D u_sampler;
      varying vec2 v_uv;
      void main() {
        gl_FragColor = texture2D(u_sampler, v_uv);
      }`;if(this._program=L(t,r,n),this._program){this._positionBuffer=t.createBuffer(),t.bindBuffer(t.ARRAY_BUFFER,this._positionBuffer),t.bufferData(t.ARRAY_BUFFER,new Float32Array(this._arrugado.pos),t.STATIC_DRAW);const i=t.getAttribLocation(this._program,"a_pos");t.vertexAttribPointer(i,2,t.FLOAT,!1,0,0),t.enableVertexAttribArray(i),this._uvBuffer=t.createBuffer(),t.bindBuffer(t.ARRAY_BUFFER,this._uvBuffer),t.bufferData(t.ARRAY_BUFFER,new Float32Array(this._arrugado.uv),t.STATIC_DRAW);const s=t.getAttribLocation(this._program,"a_uv");t.vertexAttribPointer(s,2,t.FLOAT,!1,0,0),t.enableVertexAttribArray(s),this._verticesIndexBuffer=t.createBuffer(),t.bindBuffer(t.ELEMENT_ARRAY_BUFFER,this._verticesIndexBuffer),t.bufferData(t.ELEMENT_ARRAY_BUFFER,new Uint16Array(this._arrugado.trigs),t.STATIC_DRAW)}}onRemove(e,t){t.deleteProgram(this._program),t.deleteTexture(this._texture),t.deleteBuffer(this._verticesIndexBuffer)}render(e,t){this._loaded&&this._program&&(e.useProgram(this._program),e.uniformMatrix4fv(e.getUniformLocation(this._program,"u_matrix"),!1,t),e.bindBuffer(e.ARRAY_BUFFER,this._positionBuffer),e.vertexAttribPointer(e.getAttribLocation(this._program,"a_pos"),2,e.FLOAT,!1,0,0),e.bindBuffer(e.ARRAY_BUFFER,this._uvBuffer),e.vertexAttribPointer(e.getAttribLocation(this._program,"a_uv"),2,e.FLOAT,!1,0,0),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,this._verticesIndexBuffer),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this._texture),e.uniform1i(e.getUniformLocation(this._program,"u_sampler"),0),e.drawElements(e.TRIANGLES,this._arrugado.trigs.length,e.UNSIGNED_SHORT,0),e.bindBuffer(e.ARRAY_BUFFER,null),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null))}update(e){this._loaded=!1,this._option.url=e,this._gl&&this._map&&this._loadImage(this._map,this._gl)}_initArrugator(e,t){const r=[-20037508342789244e-9,20037508342789244e-9],n=[t[0],t[3],t[1],t[2]],i=v.default(e,"EPSG:3857").forward;function s(d){const c=i(d),p=Math.abs((c[0]-r[0])/(20037508342789244e-9*2)),l=Math.abs((c[1]-r[1])/(20037508342789244e-9*2));return[p,l]}const a=1e-11,h=[[0,0],[0,1],[1,0],[1,1]],_=new x(s,n,h,[[0,1,3],[0,3,2]]);return _.lowerEpsilon(a),_.output()}_loadImage(e,t){B(this._option.url).then(r=>{this._loaded=!0,this._texture=t.createTexture(),t.bindTexture(t.TEXTURE_2D,this._texture);const n=this._option.resampling==="nearest"?t.NEAREST:t.LINEAR;t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,n),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,n),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,r),e.triggerRepaint()})}}const E="mapboxgl-echarts";class m{constructor(e){this.dimensions=["x","y"],this._mapOffset=[0,0],this.map=e}create(e){e.eachSeries(t=>{t.get("coordinateSystem")===E&&(t.coordinateSystem=new m(this.map))})}dataToPoint(e){const t=this.map.project(e),r=this._mapOffset;return[t.x-r[0],t.y-r[1]]}pointToData(e){const t=this._mapOffset,r=this.map.unproject([e[0]+t[0],e[1]+t[1]]);return[r.lng,r.lat]}}class w{constructor(e,t){this._registered=!1,this.id=e,this.type="custom",this.renderingMode="2d",this._coordSystemName=E,this._ecOption=t}onAdd(e){this._map=e,this._createLayerContainer()}onRemove(){var e;(e=this._ec)==null||e.dispose(),this._removeLayerContainer()}setOption(e){var t;(t=this._ec)==null||t.setOption(e)}render(){this._container||this._createLayerContainer(),this._ec?this._map.isMoving()?this._ec.clear():(this._ec.resize({width:this._map.getCanvas().width,height:this._map.getCanvas().height}),this._ec.setOption(this._ecOption)):(this._ec=T.init(this._container),this._prepareECharts(),this._ec.setOption(this._ecOption))}_prepareECharts(){if(!this._registered){const t=new m(this._map);T.registerCoordinateSystem(this._coordSystemName,t),this._registered=!0}const e=this._ecOption.series;if(e)for(let t=e.length-1;t>=0;t--)e[t].coordinateSystem=this._coordSystemName}_createLayerContainer(){const e=this._map.getCanvasContainer();this._container=document.createElement("div"),this._container.style.width=this._map.getCanvas().style.width,this._container.style.height=this._map.getCanvas().style.height,e.appendChild(this._container)}_removeLayerContainer(){var e;this._container&&((e=this._container.parentNode)==null||e.removeChild(this._container))}}u.EChartsLayer=w,u.ImageLayer=F,Object.defineProperties(u,{__esModule:{value:!0},[Symbol.toStringTag]:{value:"Module"}})});
