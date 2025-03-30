import { lerp, Vec3, Quat } from './utils.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.fov = Math.PI / 3;
        this.aspectRatio = canvas.width / canvas.height;
        this.nearPlane = 0.1;
        this.farPlane = 1 * 10**8;
        this.canvasCenterX = this.canvas.width / 2;
        this.canvasCenterY = this.canvas.height / 2;
    }

    clearCanvas(color = '#261e56') { 
        this.canvas.width = this.canvas.width; // Optimized clear
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    projectPoint(x, y, z) {
        const tanHalfFOV = Math.tan(this.fov / 2);
        if (z <= this.nearPlane) {
             return null;
        }
        const screenX = (x / (z * tanHalfFOV * this.aspectRatio) + 1) * this.canvas.width / 2;
        const screenY = (-y / (z * tanHalfFOV) + 1) * this.canvas.height / 2;
        const size = (1 / (z * tanHalfFOV)) * this.canvas.height / 2;
        return { x: screenX, y: screenY, size: size, z: z };
    }

    drawPixel(x, y, color, alpha) {
         if (x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) return;
        const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
        this.ctx.fillStyle = `${color}${alphaHex}`;
        this.ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
    }

    drawCircle(x, y, radius, color, alpha) {
         if (radius < 0.5) {
              this.drawPixel(x, y, color, alpha);
              return;
         }
          if (x + radius < 0 || x - radius >= this.canvas.width || y + radius < 0 || y - radius >= this.canvas.height) return;

         const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = `${color}${alphaHex}`;
        this.ctx.fill();
    }

    drawText(text, x, y, color = '#FFFFFF', size = 12, align = 'center', baseline = 'middle') {
        this.ctx.font = `${size}px sans-serif`;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
        this.ctx.fillText(text, x, y);
    }

    renderBody(body, frameCounter) {
        // --- RETAINED ORIGINAL renderBody ---
        const projected = this.projectPoint(body.x, body.y, body.z);
        if (!projected) return;

        const screenX = projected.x;
        const screenY = projected.y;
        const pixelSize = body.size * projected.size;

        const distanceFactor = Math.max(0, 1 - (body.z / this.farPlane));
        const alpha = Math.max(0.1, distanceFactor);
        const scaledSize = pixelSize * (body.isStar ? 1 : Math.max(0.5, distanceFactor));

        if (scaledSize < 1) {
            if (body.isStar) {
                const drawProbability = scaledSize * 130;
                const offsetFrame = (frameCounter + body.colorIndex * 10) % 100;
                if (offsetFrame < drawProbability) {
                    this.drawPixel(screenX, screenY, body.color, alpha);
                }
            } else {
                const drawProbability = scaledSize * 1000;
                const offsetFrame = (frameCounter + body.colorIndex * 10) % 100;
                if (offsetFrame < drawProbability && scaledSize > 0.2) {
                    this.drawPixel(screenX, screenY, body.color, alpha);
                }
            }
        } else {
            this.drawCircle(screenX, screenY, scaledSize, body.color, alpha);
        }
        // --- END RETAINED ORIGINAL renderBody ---
    }

    renderBodies(bodies, frameCounter) {
        bodies.forEach(body => this.renderBody(body, frameCounter));
    }

    renderOtherPlayer(relativeVertices, faces, colorHue, playerId, chatBubbles) {
         // --- RETAINED ORIGINAL renderOtherPlayer CORE ---
        // console.log('Rendering other player. Vertices:', relativeVertices.length, 'Faces:', faces.length); // Reduce logging

        let centerZ = 0;
        let visibleCount = 0;
        relativeVertices.forEach(v => { if (v.z > this.nearPlane) { centerZ+=v.z; visibleCount++; } });
        if (visibleCount === 0) return; // Early exit if all vertices behind
        centerZ /= visibleCount;

        if (centerZ <= this.nearPlane || centerZ > this.farPlane) {
            // console.log('Player is not visible (center Z out of bounds)');
            return;
        }

        let projectedVertices = [];
        let highestScreenY = this.canvas.height;
        let highestPointX = this.canvasCenterX;
        let highestPointZ = this.farPlane;

        for (const v of relativeVertices) {
             const pv = this.projectPoint(v.x, v.y, v.z);
             projectedVertices.push(pv);
             if (pv && pv.y < highestScreenY) {
                  highestScreenY = pv.y;
                  highestPointX = pv.x;
                  highestPointZ = pv.z;
             }
        }

        const sortedFaces = faces.map((face, index) => {
             let faceAvgZ = 0;
             let validVerticesInFace = 0;
             let faceBehind = false;
             face.forEach(vertexIndex => {
                  const pv = projectedVertices[vertexIndex];
                  if (pv) {
                       faceAvgZ += pv.z;
                       validVerticesInFace++;
                  } else { faceBehind = true; }
             });
             if (validVerticesInFace < 3 || faceBehind) {
                  return { avgZ: Infinity, screenCoords: [] };
             }
             return {
                 index, // Keep original index for shading ref
                 avgZ: faceAvgZ / 3,
                 screenCoords: face.map(vertexIndex => projectedVertices[vertexIndex])
             };
        }).sort((a, b) => b.avgZ - a.avgZ);

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;

        sortedFaces.forEach(({ index, avgZ, screenCoords }) => {
             if (avgZ !== Infinity && screenCoords.length === 3) {
                this.ctx.beginPath();
                this.ctx.moveTo(screenCoords[0].x, screenCoords[0].y);
                this.ctx.lineTo(screenCoords[1].x, screenCoords[1].y);
                this.ctx.lineTo(screenCoords[2].x, screenCoords[2].y);
                this.ctx.closePath();
                const lightness = [2, 3, 4, 5, 6, 7].includes(index) ? 30 : 50; // Original shading
                const faceColor = `hsl(${colorHue}, 70%, ${lightness}%)`;
                this.ctx.fillStyle = faceColor;
                this.ctx.fill();
                this.ctx.stroke();
            }
        });
         // --- END RETAINED ORIGINAL renderOtherPlayer CORE ---


        // --- ADDED Chat Bubble Logic (Appended) ---
         const bubble = chatBubbles.get(playerId);
         if (bubble && highestPointZ > this.nearPlane && highestScreenY < this.canvas.height) {
             const now = Date.now();
             const age = now - bubble.time;
             const bubbleDuration = 8000;
             if (age < bubbleDuration) {
                 const bubbleAlpha = 0.9 * Math.max(0, 1 - (age / bubbleDuration));
                 const text = bubble.message;
                 const bubbleY = highestScreenY - 15;
                 const bubbleX = highestPointX;
                 this.ctx.font = '11px sans-serif';
                 const textMetrics = this.ctx.measureText(text);
                 const textWidth = textMetrics.width;
                 const padding = 3;
                 this.ctx.fillStyle = `rgba(0, 0, 0, ${bubbleAlpha * 0.6})`;
                 this.ctx.fillRect(bubbleX - textWidth / 2 - padding, bubbleY - 11 - padding, textWidth + padding * 2, 11 + padding * 2);
                 this.drawText(text, bubbleX, bubbleY, `rgba(255, 255, 255, ${bubbleAlpha})`, 11, 'center', 'bottom');
             }
         }
         // --- END ADDED Chat Bubble Logic ---
    }

    // --- Updated UI Rendering Methods ---

    renderNavigator(relativeTargetPos, playerOrientation) {
         if (!relativeTargetPos) return;

         const viewSpacePos = playerOrientation.inverse().rotate(relativeTargetPos);
         let targetX = viewSpacePos.x;
         let targetY = viewSpacePos.y;
         let targetZ = viewSpacePos.z;
         let isBehind = targetZ <= this.nearPlane;

         // Project the point (or a point clamped just in front if target is behind)
         let clampedZ = isBehind ? this.nearPlane + 0.01 : targetZ; // Project slightly in front if behind
         const projected = this.projectPoint(targetX, targetY, clampedZ);

         if (projected) {
             let screenX = projected.x;
             let screenY = projected.y;
             const isOffScreen = screenX < 0 || screenX > this.canvas.width || screenY < 0 || screenY > this.canvas.height || isBehind;

             if (isOffScreen) {
                 // --- Draw Triangle for Off-Screen ---
                 const margin = 15; // Distance from edge

                 // Calculate angle towards the projected point from screen center
                 const angle = Math.atan2(screenY - this.canvasCenterY, screenX - this.canvasCenterX);

                 // Clamp position to edge
                 // This is a simplified clamping; precise edge intersection is more complex
                 const clampedRadiusX = this.canvasCenterX - margin;
                 const clampedRadiusY = this.canvasCenterY - margin;
                 let edgeX = this.canvasCenterX + Math.cos(angle) * clampedRadiusX;
                 let edgeY = this.canvasCenterY + Math.sin(angle) * clampedRadiusY;

                 // Further clamp to bounding box
                  edgeX = Math.max(margin, Math.min(this.canvas.width - margin, edgeX));
                  edgeY = Math.max(margin, Math.min(this.canvas.height - margin, edgeY));


                 // Define triangle points (pointing inwards)
                 const triangleSize = 8;
                 const color = 'rgba(255, 100, 0, 0.8)'; // Orange for off-screen

                 this.ctx.save(); // Save context state
                 this.ctx.translate(edgeX, edgeY); // Move origin to edge point
                 this.ctx.rotate(angle); // Rotate context to point triangle inwards
                 this.ctx.fillStyle = color;
                 this.ctx.beginPath();
                 // Draw triangle pointing along the positive X axis after rotation
                 this.ctx.moveTo(triangleSize, 0);
                 this.ctx.lineTo(-triangleSize / 2, -triangleSize / 2);
                 this.ctx.lineTo(-triangleSize / 2, triangleSize / 2);
                 this.ctx.closePath();
                 this.ctx.fill();
                 this.ctx.restore(); // Restore context state

                 // Optional: Draw distance text near triangle
                  const dist = relativeTargetPos.length();
                  // Adjust text position based on angle to avoid overlapping triangle
                  let textX = edgeX + Math.cos(angle + Math.PI) * (triangleSize + 20); // Offset opposite to angle
                  let textY = edgeY + Math.sin(angle + Math.PI) * (triangleSize + 20);
                  this.drawText(`${(dist / 1000).toFixed(1)}km`, textX, textY, '#FFA500', 10);


             } else {
                  // --- Draw Circle for On-Screen ---
                  const indicatorColor = 'rgba(0, 255, 150, 0.7)'; // Cyan on-screen
                  const indicatorSize = 8;

                  this.ctx.beginPath();
                  this.ctx.arc(screenX, screenY, indicatorSize, 0, 2 * Math.PI);
                  this.ctx.fillStyle = indicatorColor;
                  this.ctx.fill();
                   this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                   this.ctx.lineWidth = 1;
                   this.ctx.stroke();

                  // Draw distance text below circle
                   const dist = relativeTargetPos.length();
                   this.drawText(`${(dist / 1000).toFixed(1)}km`, screenX, screenY + indicatorSize + 5, '#FFF', 10, 'center', 'top');
              }
         }
    }

    // Main UI Render Call - Only Navigator drawn on canvas now
    renderUI(selectedPlayerId, relativeNavTargetPos, playerOrientation, frameCounter) {
        // Player list is now HTML, not rendered here
        this.renderNavigator(relativeNavTargetPos, playerOrientation);
    }

} // End of Renderer class
