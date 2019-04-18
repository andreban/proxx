/**
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// On KaiOS browser, zoom in/out changes both screen.width and window.innerWidth.
// This makes it hard to detect an actual screen size in order to provide
// better visual guide (such as focus on mouse hover) for the smaller screen.
//
// Since zoom level is set to default every time a page gets loaded,
// implementation below stores initial screen width and height.
export const staticScreenWidth = screen.width;
export const staticScreenHeight = screen.height;
