// renderer.js
import { lerp, Vec3, Quat } from './utils.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.fov = Math.PI / 3;
        this.aspectRatio = canvas.width / canvas.height;
        this.nearPlane = 0.1;
        this.farPlane = 100 * 100 * 100 * 7; // Adjusted to match STARFIELD_RADIUS * 3
    }

    clearCanvas(color = '#261e56') {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    projectPoint(x, y, z) {
        const tanHalfFOV = Math.tan(this.fov / 2);
        const screenX = (x / (z * tanHalfFOV * this.aspectRatio) + 1) * this.canvas.width / 2;
        const screenY = (-y / (z * tanHalfFOV) + 1) * this.canvas.height / 2;
        const size = 1 / (z * tanHalfFOV) * this.canvas.height / 2;
        return { x: screenX, y: screenY, size: size };
    }

    drawPixel(x, y, color, alpha) {
        this.ctx.fillStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
        this.ctx.fillRect(x, y, 1, 1);
    }

    drawCircle(x, y, radius, color, alpha) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
        this.ctx.fill();
    }

    renderBody(body, frameCounter) {
        if (body.z <= this.nearPlane || body.z >= this.farPlane) return;

        const projected = this.projectPoint(body.x, body.y, body.z);
        const screenX = projected.x;
        const screenY = projected.y;
        const pixelSize = body.size * projected.size;

        const distanceFactor = 1 - (body.z / this.farPlane);
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
    }

    renderBodies(bodies, frameCounter) {
        bodies.forEach(body => this.renderBody(body, frameCounter));
    }
	
	renderOtherPlayer(vertices, faces, color) {
		console.log('Rendering other player. Vertices:', vertices.length, 'Faces:', faces.length);

		const centerPoint = vertices.reduce((acc, v) => ({
			x: acc.x + v.x / vertices.length,
			y: acc.y + v.y / vertices.length,
			z: acc.z + v.z / vertices.length
		}), {x: 0, y: 0, z: 0});

		if (centerPoint.z <= this.nearPlane || centerPoint.z > this.farPlane) {
			console.log('Player is not visible');
			return;
		}

		const projectedVertices = vertices.map(v => this.projectPoint(v.x, v.y, v.z));

		// Sort faces by average Z coordinate (painter's algorithm)
		const sortedFaces = faces.map((face, index) => ({
			face,
			index,
			avgZ: (vertices[face[0]].z + vertices[face[1]].z + vertices[face[2]].z) / 3
		})).sort((a, b) => b.avgZ - a.avgZ);

		// Draw faces
		this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
		this.ctx.lineWidth = 1;

		sortedFaces.forEach(({ face, index }) => {
			const screenCoords = face.map(index => projectedVertices[index]);
			
			if (screenCoords.every(v => v.size > 0)) {
				this.ctx.beginPath();
				this.ctx.moveTo(screenCoords[0].x, screenCoords[0].y);
				this.ctx.lineTo(screenCoords[1].x, screenCoords[1].y);
				this.ctx.lineTo(screenCoords[2].x, screenCoords[2].y);
				this.ctx.closePath();

				// Simplified shading
				const lightness = [2, 3, 4, 5, 6, 7].includes(index) ? 30 : 50; // Darker for the back and bottom faces
				const faceColor = `hsl(${color}, 70%, ${lightness}%)`;

				this.ctx.fillStyle = faceColor;
				this.ctx.fill();
				this.ctx.stroke();
			}
		});

		console.log('Rendered simplified ship for other player');
	}
	
	drawText(x, y, text) {
		this.ctx.font = '16px Arial';
		this.ctx.fillStyle = '#FFFFFF';
		this.ctx.textAlign = 'center';
		this.ctx.fillText(text, x, y);
	}


}

