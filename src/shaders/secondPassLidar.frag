#ifdef GL_FRAGMENT_PRECISION_HIGH
 // highp is supported
 precision highp int;
 precision highp float;
#else
 // high is not supported
 precision mediump int;
 precision mediump float;
#endif

varying vec4 frontColor;
varying vec4 pos;

uniform sampler2D uColormap;
uniform sampler2D uBackCoord;
uniform sampler2D uTransferFunction;
uniform sampler2D uSliceMaps[<%= maxTexturesNumber %>];

// returns total number of slices of all slicemaps
uniform float uNumberOfSlices;
uniform float uMinGrayVal;
uniform float uMaxGrayVal;
uniform float uOpacityVal;
uniform float uColorVal;
uniform float uAbsorptionModeIndex;
uniform float uSlicesOverX;
uniform float uSlicesOverY;
uniform float uSlicemapWidth;

float getVolumeValue(vec3 volpos)
{
    float value1 = 0.0;
    vec2 texpos1;
    vec3 value1_vec;
    
    float eps =pow(2.0,-16.0);
    if (volpos.x >= 1.0)
        volpos.x = 1.0-eps;
    if (volpos.y >= 1.0)
        volpos.y = 1.0-eps;
    if (volpos.z >= 1.0)
        volpos.z = 1.0-eps;
    
    float slicesPerSlicemap = uSlicesOverX * uSlicesOverY; 

    float sliceNo = floor(volpos.z*(uNumberOfSlices));
    
    int texIndexOfSlicemap = int(floor(sliceNo / slicesPerSlicemap));

    float s1 = mod(sliceNo, slicesPerSlicemap);

    float dx1 = fract(s1/uSlicesOverX);
    float dy1 = floor(s1/uSlicesOverY)/uSlicesOverY;      
       
    float sliceSizeX = uSlicemapWidth/uSlicesOverX;
    float sliceSizeY = uSlicemapWidth/uSlicesOverY;
    
    texpos1.x = dx1+(floor(volpos.x*sliceSizeX)+0.5)/uSlicemapWidth;
    texpos1.y = dy1+(floor(volpos.y*sliceSizeY)+0.5)/uSlicemapWidth;
 
    <% for(var i=0; i < maxTexturesNumber; i++) { %>
        if( texIndexOfSlicemap == <%=i%> )
        {
          value1_vec = texture2D(uSliceMaps[<%=i%>],texpos1).rgb;
          //value1 = ((value1_vec.r + value1_vec.g + value1_vec.b)/3.0);
          //value1 = ((value1_vec.r * 0.299)+(value1_vec.g * 0.587)+(value1_vec.b * 0.114));
          value1 = value1_vec.r;
        }

        <% if( i < maxTexturesNumber-1 ) { %>
            else
        <% } %>
    <% } %>
    

    return value1;

}

void main(void)
{

 vec2 texC = ((pos.xy/pos.w) + 1.0) / 2.0;
 vec4 backColor = texture2D(uBackCoord,texC);
 vec3 dir = backColor.rgb - frontColor.rgb;
 vec4 vpos = frontColor;
 
 
 float dir_length = length(dir);
 float uStepsF = ceil((dir_length)*(uNumberOfSlices-1.0));
 vec3 Step = dir/(uStepsF);
 int uStepsI = int(uStepsF);
 

 vec4 accum = vec4(0, 0, 0, 0);
 vec4 sample = vec4(0.0, 0.0, 0.0, 0.0);
 vec4 colorValue = vec4(0, 0, 0, 0);
 float biggest_gray_value = 0.0;

 float opacityFactor = uOpacityVal;
 float lightFactor = uColorVal;
 
 
 
 // Empty Skipping
 for(int i = 0; i < 4096; i+=1)
 {
     if(i == uStepsI) 
         break;
 
     float gray_val = getVolumeValue(vpos.xyz);
   
     if(gray_val <= uMinGrayVal || gray_val >= uMaxGrayVal) 
         uStepsF -= 1.0;
     
     vpos.xyz += Step;
     
     if(vpos.x > 1.0 || vpos.y > 1.0 || vpos.z > 1.0 || vpos.x < 0.0 || vpos.y < 0.0 || vpos.z < 0.0) 
         break; 

 }

 vpos = frontColor;
 
 
 for(int i = 0; i < 4096; i+=1)
 {
     if(i == uStepsI) {
         break;
     }

     float gray_val = getVolumeValue(vpos.xyz);

     if(gray_val < uMinGrayVal || gray_val > uMaxGrayVal) {
         colorValue = vec4(0.0);
         accum=accum+colorValue;

         if(accum.a>=1.0)
            break;

     } else {
         // Stevens mode
             vec2 tf_pos; 
             tf_pos.x = (gray_val - uMinGrayVal) / (uMaxGrayVal - uMinGrayVal); 
             tf_pos.x = gray_val;
             tf_pos.y = 0.5; 

             colorValue = texture2D(uColormap,tf_pos);
             //colorValue = texture2D(uTransferFunction,tf_pos);
             //colorValue = vec4(tf_pos.x, tf_pos.x, tf_pos.x, 1.0); 

             sample.a = colorValue.a * opacityFactor * (1.0 / uStepsF); 
             //sample.rgb = (1.0 - accum.a) * colorValue.rgb * sample.a * uColorVal; 
             sample.rgb = colorValue.rgb; 
             accum += sample; 

             if(accum.a>=1.0) 
                break; 
     }

     //advance the current position
     vpos.xyz += Step;
     
     //break if the position is greater than <1, 1, 1> 
     if(vpos.x > 1.0 || vpos.y > 1.0 || vpos.z > 1.0 || vpos.x < 0.0 || vpos.y < 0.0 || vpos.z < 0.0) 
     { 
         break; 
     } 
     
 }

 gl_FragColor = accum;

}
