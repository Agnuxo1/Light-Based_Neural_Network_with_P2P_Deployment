'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import * as pdfjs from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

const TEXTURE_SIZE = 4096
const MAX_WORDS = 100000

const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0, 1);
    v_texCoord = (a_position + 1.0) / 2.0;
  }
`;

const fragmentShaderSource = `
  precision highp float;
  varying vec2 v_texCoord;
  uniform sampler2D u_wordData;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;
  uniform int u_wordCount;

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  float neuron(vec2 uv, vec2 center, float radius) {
    float dist = length(uv - center);
    return smoothstep(radius, radius * 0.9, dist);
  }

  void main() {
    vec2 uv = v_texCoord;
    vec2 pos = uv * u_resolution;
    
    vec4 wordData = texture2D(u_wordData, uv);
    
    float frequency = wordData.r;
    float hue = wordData.g;
    float saturation = wordData.b;
    
    vec3 color = hsv2rgb(vec3(hue, saturation, frequency));
    
    // Light processing simulation
    float light = 0.0;
    for (int i = 0; i < 10; i++) {
      vec2 neuronPos = vec2(
        0.1 + 0.8 * float(i) / 10.0,
        0.5 + 0.3 * sin(u_time + float(i) * 0.5)
      );
      light += neuron(uv, neuronPos, 0.05) * frequency;
    }
    
    color += vec3(light * 0.5);
    
    float distToMouse = length(uv - u_mouse);
    float pulseIntensity = (sin(u_time * 2.0 - distToMouse * 10.0) + 1.0) * 0.5;
    color += vec3(pulseIntensity * 0.1);
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create program");
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

function createAndSetupTexture(gl: WebGLRenderingContext) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return texture;
}

interface WordData {
  word: string;
  frequency: number;
  hue: number;
  saturation: number;
  nextWords: Map<string, number>;
}

export default function EnhancedLightBasedNeuralProcessor() {
  const [words, setWords] = useState<WordData[]>([]);
  const [inputPhrase, setInputPhrase] = useState('');
  const [outputPhrase, setOutputPhrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const wordDataTextureRef = useRef<WebGLTexture | null>(null);
  const mouseRef = useRef<[number, number]>([0.5, 0.5]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      setError('WebGL is not supported in your browser.');
      return;
    }
    glRef.current = gl;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      setError('Failed to compile shaders.');
      return;
    }

    const program = createProgram(gl, vertexShader, fragmentShader);

    if (!program) {
      setError('Failed to create shader program.');
      return;
    }

    programRef.current = program;

    wordDataTextureRef.current = createAndSetupTexture(gl);

    const wordData = new Float32Array(TEXTURE_SIZE * TEXTURE_SIZE * 4);
    for (let i = 0; i < wordData.length; i += 4) {
      wordData[i] = Math.random();
      wordData[i + 1] = Math.random();
      wordData[i + 2] = Math.random();
      wordData[i + 3] = 1.0;
    }
    gl.bindTexture(gl.TEXTURE_2D, wordDataTextureRef.current);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TEXTURE_SIZE, TEXTURE_SIZE, 0, gl.RGBA, gl.FLOAT, wordData);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
      -1, -1,
      1, -1,
      -1, 1,
      1, 1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    const animate = (time: number) => {
      render(time);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = [
        (event.clientX - rect.left) / canvas.width,
        1 - (event.clientY - rect.top) / canvas.height,
      ];
    });

  }, []);

  const render = useCallback((time: number) => {
    const gl = glRef.current;
    const program = programRef.current;
    if (!gl || !program) return;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    gl.uniform1f(gl.getUniformLocation(program, "u_time"), time * 0.001);
    gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), gl.canvas.width, gl.canvas.height);
    gl.uniform2f(gl.getUniformLocation(program, "u_mouse"), mouseRef.current[0], mouseRef.current[1]);
    gl.uniform1i(gl.getUniformLocation(program, "u_wordCount"), words.length);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, wordDataTextureRef.current);
    gl.uniform1i(gl.getUniformLocation(program, "u_wordData"), 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }, [words.length]);

  const updateWordData = useCallback((newWords: WordData[]) => {
    const gl = glRef.current;
    if (gl && wordDataTextureRef.current) {
      const wordData = new Float32Array(TEXTURE_SIZE * TEXTURE_SIZE * 4);
      newWords.forEach((word, index) => {
        const i = index * 4;
        wordData[i] = word.frequency / Math.max(...newWords.map(w => w.frequency));
        wordData[i + 1] = word.hue;
        wordData[i + 2] = word.saturation;
        wordData[i + 3] = 1.0;
      });
      gl.bindTexture(gl.TEXTURE_2D, wordDataTextureRef.current);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TEXTURE_SIZE, TEXTURE_SIZE, gl.RGBA, gl.FLOAT, wordData);
    }
  }, []);

  const addWords = useCallback((newWords: string[]) => {
    setWords(prevWords => {
      const wordMap = new Map(prevWords.map(w => [w.word, w]));
      for (let i = 0; i < newWords.length - 1; i++) {
        const currentWord = newWords[i];
        const nextWord = newWords[i + 1];
        if (wordMap.has(currentWord)) {
          const word = wordMap.get(currentWord)!;
          word.frequency += 1;
          word.nextWords.set(nextWord, (word.nextWords.get(nextWord) || 0) + 1);
        } else if (wordMap.size < MAX_WORDS) {
          wordMap.set(currentWord, {
            word: currentWord,
            frequency: 1,
            hue: Math.random(),
            saturation: 0.5 + Math.random() * 0.5,
            nextWords: new Map([[nextWord, 1]])
          });
        }
      }
      const updatedWords = Array.from(wordMap.values())
        .sort((a, b) => b.frequency - a.frequency);
      updateWordData(updatedWords);
      return updatedWords;
    });
  }, [updateWordData]);

  const processInput = useCallback((phrase: string) => {
    const inputWords = phrase.toLowerCase().split(/\s+/).slice(0, 10);
    addWords(inputWords);
    
    const outputWords: string[] = [];
    let currentWord = inputWords[inputWords.length - 1];
    for (let i = 0; i < 10; i++) {
      const wordData = words.find(w => w.word === currentWord);
      if (!wordData || wordData.nextWords.size === 0) break;
      
      const nextWords = Array.from(wordData.nextWords.entries());
      nextWords.sort((a, b) => b[1] - a[1]);
      const nextWord = nextWords[0][0];
      outputWords.push(nextWord);
      currentWord = nextWord;
    }
    setOutputPhrase(outputWords.join(' '));
  }, [words, addWords]);

  const processPDF = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument(arrayBuffer).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ') + ' ';
      setProgress((i / pdf.numPages) * 100);
    }
    return text;
  };

  const processFile = useCallback(async (file: File) => {
    try {
      setIsProcessing(true);
      setProgress(0);
      let text = '';

      if (file.name.endsWith('.txt')) {
        text = await file.text();
      } else if (file.name.endsWith('.pdf')) {
        text = await processPDF(file);
      } else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
        // Here would be the logic to process Word documents
        text = "DOC/DOCX processing not implemented in this example";
      } else if (file.name.endsWith('.csv')) {
        const csvText = await file.text();
        text = csvText.replace(/,/g, ' ');
      } else {
        throw new Error('Unsupported file  type');
      }

      const wordsFromFile = text.toLowerCase().match(/\b\w+\b/g) || [];
      const totalWords = wordsFromFile.length;
      
      for (let i = 0; i < totalWords; i += 1000) {
        const batch = wordsFromFile.slice(i, i + 1000);
        addWords(batch);
        setProgress((i + batch.length) / totalWords * 100);
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      setIsProcessing(false);
      setError(null);
    } catch (err) {
      setError('Error processing file. Please try again.');
      setIsProcessing(false);
    }
  }, [addWords]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">Enhanced Light-Based Neural Processor</h1>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Words to Neural Network</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Input
              type="file"
              accept=".txt,.pdf,.doc,.docx,.csv"
              onChange={handleFileUpload}
              className="flex-grow"
            />
          </div>
          {isProcessing && (
            <div className="mt-4">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2">Processing words: {progress.toFixed(0)}%</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Word Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-60 overflow-y-auto">
              <ul className="list-disc list-inside">
                {words.slice(0, 100).map((word, index) => (
                  <li key={index} className="mb-1">
                    {word.word}: {word.frequency} 
                    <span 
                      className="ml-2 inline-block w-4 h-4 rounded-full" 
                      style={{
                        backgroundColor: `hsl(${word.hue * 360}, ${word.saturation * 100}%, ${50 + word.frequency * 5}%)`
                      }}
                    ></span>
                  </li>
                ))}
                {words.length > 100 && (
                  <li className="mb-1">... and {words.length - 100} more words</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Neural Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="inputPhrase">Input Phrase (up to 10 words):</Label>
                <Input
                  id="inputPhrase"
                  type="text"
                  value={inputPhrase}
                  onChange={(e) => setInputPhrase(e.target.value)}
                  placeholder="Enter input phrase"
                />
              </div>
              <Button onClick={() => processInput(inputPhrase)}>Process</Button>
              <Separator />
              <div>
                <Label>Output Phrase:</Label>
                <p className="text-lg font-semibold mt-1">{outputPhrase}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Light-Based Neural Network Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <canvas 
            ref={canvasRef} 
            width={512} 
            height={512} 
            className="w-full h-auto border border-gray-300"
          />
        </CardContent>
      </Card>
    </div>
  )
}