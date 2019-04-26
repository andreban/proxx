#version 100
precision highp float;

varying vec2 uv;
varying vec4 dynamic_tile_data_a2;
varying vec4 dynamic_tile_data_b2;
varying vec2 iResolution2;

uniform float idle_frames;
uniform float sprite_size;
uniform float tile_size;
uniform sampler2D idle_sprites[4];
uniform sampler2D static_sprite;
uniform vec2 paddings;

void main() {
  vec4 white = vec4(1.);
  vec4 black = vec4(vec3(0.), 1.);
  vec4 transparent = vec4(0.);
  vec4 turquoise = vec4(vec3(109., 205., 218.)/255., 1.);

  vec2 normalized_uv = vec2(0., 1.) + vec2(1., -1.)*uv;

  float has_focus = dynamic_tile_data_a2.x;
  float tile_y = dynamic_tile_data_a2.y;
  float static_tile = dynamic_tile_data_a2.z;
  float idle_animation_time = dynamic_tile_data_a2.w;

  float highlight_opacity = dynamic_tile_data_b2.x;
  float flash_opacity = dynamic_tile_data_b2.y;
  float border_opacity = dynamic_tile_data_b2.z;
  float boxes_opacity = dynamic_tile_data_b2.w;

  float frames_per_axis = floor(sprite_size /tile_size);
  float frames_per_sprite = frames_per_axis * frames_per_axis;

  float f;
  if(static_tile < 0.) {
    float idle_frame = floor(idle_animation_time * idle_frames);

    int sprite_idx = int(floor(idle_frame / frames_per_sprite));
    float frame_in_sprite = mod(idle_frame, frames_per_sprite);
    float frame_x = mod(frame_in_sprite, frames_per_axis);
    float frame_y = floor(frame_in_sprite / frames_per_axis);

    vec2 idle_tex_uv = (vec2(frame_x, frame_y) + normalized_uv) * tile_size / sprite_size;
    // WebGL 1 can only access arrays with compile-time constant indices.
    // So be it.
    if(sprite_idx == 0) {
      f = texture2D(idle_sprites[0], idle_tex_uv).a;
    } else if (sprite_idx == 1) {
      f = texture2D(idle_sprites[1], idle_tex_uv).a;
    } else if (sprite_idx == 2) {
      f = texture2D(idle_sprites[2], idle_tex_uv).a;
    } else if (sprite_idx == 3) {
      f = texture2D(idle_sprites[3], idle_tex_uv).a;
    }
    f *= boxes_opacity;
  } else if (static_tile >= 1.) {
    vec2 number_tex_uv = (vec2(mod(static_tile, frames_per_axis), floor(static_tile/frames_per_axis)) + normalized_uv) * tile_size / sprite_size;
    f = mix(f, 1., texture2D(static_sprite, number_tex_uv).a);
  }

  // Blend static outline on top
  vec2 outline_tex_uv = (vec2(0.) + normalized_uv) * tile_size / sprite_size;
  f = mix(f, 1., texture2D(static_sprite, outline_tex_uv).a * border_opacity);

  // Blend flash on top
  vec2 flash_tex_uv = (vec2(9., 0.) + normalized_uv) * tile_size / sprite_size;
  f = mix(f, 1., texture2D(static_sprite, flash_tex_uv).a * flash_opacity);

  // Change color according to highlight setting
  vec4 target_color = mix(white, turquoise, highlight_opacity);

  vec4 tile = mix(transparent, target_color, f);

  // Add focus ring
  vec2 focus_tex_uv = (vec2(1., 1.) + normalized_uv) * tile_size / sprite_size;
  vec4 focused_tile = mix(
    tile,
    white,
    texture2D(static_sprite, focus_tex_uv).a * has_focus
  );
  gl_FragColor = focused_tile;

  // Fade out at the border
  vec2 padding_factor = vec2(0., .5);
  vec2 border_fade =
    smoothstep(paddings*padding_factor, paddings, gl_FragCoord.xy) *
    (vec2(1.) - smoothstep(iResolution2 - paddings, iResolution2 - paddings*padding_factor, gl_FragCoord.xy));
  f *= min(border_fade.x, border_fade.y);

  gl_FragColor = mix(transparent, target_color, f);
}
