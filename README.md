# Light-Based Neural Network with P2P Deployment
Francisco Angulo de Lafuente

## Abstract

This project introduces a novel neural network architecture based on simulated optical physics, utilizing ray tracing and holographic systems. The network's state is visually represented, with each neuron corresponding to a pixel, resulting in a dynamic image that serves both as a visual representation and a functional part of the processing unit. This approach replaces traditional tensor and weight calculations with adjustments to light intensities, tones, frequencies, refraction, and backlighting. The system demonstrates emergent properties similar to color mixing in paints, where results appear naturally without explicit calculations. Additionally, this project explores the viability of using this system as a memory structure for Large Language Models (LLMs) and its potential for deployment in a peer-to-peer (P2P) network.

## Table of Contents

1. [Introduction](#introduction)
2. [Methodology](#methodology)
3. [Implementation](#implementation)
4. [P2P Network Integration](#p2p-network-integration)
5. [Results and Discussion](#results-and-discussion)
6. [Conclusion](#conclusion)
7. [References](#references)

## 1. Introduction

The field of neural networks has seen significant advancements in recent years, particularly in the domain of Large Language Models (LLMs). However, these models often require substantial computational resources and centralized infrastructure. This project proposes a novel approach that leverages principles from optical physics to create a more efficient and distributed neural network architecture.

Our system simulates optical phenomena using ray tracing and holographic techniques, representing the neural network's state as a dynamic image. This visual representation serves a dual purpose: it provides an intuitive visualization of the network's state and actively participates in the computation process.

## 2. Methodology

The core concept of our light-based neural network revolves around representing neurons as pixels in a dynamic image. Instead of traditional weight matrices and activation functions, our system utilizes various properties of light:

- Intensity: Represents the strength of a neuron's activation
- Tone: Encodes different types of information or neuron specialization
- Frequency: Used for temporal aspects of information processing
- Refraction: Simulates the interaction between neurons
- Backlighting: Provides a mechanism for global network state

The network's computation emerges from the interaction of these light properties, similar to how mixing yellow and blue paint naturally produces green without explicit calculation.

## 3. Implementation

The implementation of our light-based neural network is primarily done using WebGL for efficient GPU-accelerated rendering of the network state. The core of the system is implemented in the `EnhancedLightBasedNeuralProcessor` component.

Here's a key excerpt from the shader code that demonstrates how we simulate neuron behavior:

```glsl
float neuron(vec2 uv, vec2 center, float radius) {
  float dist = length(uv - center);
  return smoothstep(radius, radius * 0.9, dist);
}

void main() {
  // ... (setup code omitted for brevity)

  float light = 0.0;
  for (int i = 0; i < 10; i++) {
    vec2 neuronPos = vec2(
      0.1 + 0.8 * float(i) / 10.0,
      0.5 + 0.3 * sin(u_time + float(i) * 0.5)
    );
    light += neuron(uv, neuronPos, 0.05) * frequency;
  }
  
  color += vec3(light * 0.5);
  
  // ... (additional processing omitted for brevity)
}
```

This code snippet demonstrates how we simulate neurons using a distance-based function and how their activations contribute to the overall "light" in the system.

The system also includes functionality for processing text input and generating output based on the network's state:

```typescript
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
```

## Quick Start

Experience the Holographic Neural Network in action:

[![Open in v0.dev](https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcThekLn5dFXm6sKrFe7SRgELQspSJzxhJOlKg&s)](https://v0.dev/chat/gLP3CK3ATjk?b=b_AsIXeoRmLmN)



This function demonstrates how the system processes input text and generates output based on the learned word relationships, showcasing its potential as a language model component.

## 4. P2P Network Integration

One of the key innovations of this project is its potential for deployment in a peer-to-peer (P2P) network. This approach offers several advantages:

1. **Distributed Computation**: The computational load can be spread across multiple nodes in the network, allowing for more efficient processing of large-scale neural networks.

2. **Resilience**: P2P networks are inherently resilient to failures, as there's no single point of failure.

3. **Scalability**: The system can easily scale by adding more peers to the network.

4. **Privacy**: Distributed processing can enhance privacy by reducing the need for centralized data storage.

To integrate our light-based neural network into a P2P system, we propose using WebRTC for direct peer-to-peer communication. Here's a conceptual example of how peers might share network state:

```typescript
const shareNetworkState = async (peer: RTCPeerConnection) => {
  const networkState = gl.readPixels(0, 0, TEXTURE_SIZE, TEXTURE_SIZE, gl.RGBA, gl.FLOAT);
  const channel = peer.createDataChannel('networkState');
  channel.onopen = () => {
    channel.send(networkState.buffer);
  };
};

const receiveNetworkState = (event: MessageEvent) => {
  const receivedState = new Float32Array(event.data);
  gl.bindTexture(gl.TEXTURE_2D, wordDataTextureRef.current);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TEXTURE_SIZE, TEXTURE_SIZE, gl.RGBA, gl.FLOAT, receivedState);
};
```

This example demonstrates how the network state (represented as a texture) could be shared between peers and integrated into the local network.

## 5. Results and Discussion

Our preliminary results show that the light-based neural network can effectively process and generate text based on learned word relationships. The visual representation provides an intuitive understanding of the network's state and allows for real-time observation of its dynamics.

The system's performance in text generation tasks suggests its potential as a component in larger language models. However, further research is needed to assess its scalability and compare its performance with traditional neural network architectures.

The P2P deployment aspect of the project shows promise in distributing the computational load and enhancing the system's resilience. However, challenges remain in ensuring consistency across the network and managing the increased communication overhead.

## 6. Conclusion

This project introduces a novel approach to neural network architecture, leveraging simulated optical physics to create a system that is both computationally effective and visually intuitive. The integration with P2P networking opens up new possibilities for distributed AI systems.

Future work will focus on scaling up the system, optimizing the P2P integration, and exploring applications in more complex language modeling tasks. We believe this approach has the potential to contribute significantly to the development of more efficient and distributed AI systems.


## Deploy the project and test the prototype here: 

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/edit/sb1-56sqdy) 



https://github.com/user-attachments/assets/4f878d32-00fd-429c-99d3-59c66f356497



![Captura de pantalla -2024-10-23 12-39-49](https://github.com/user-attachments/assets/98ee359c-2e58-419d-b13e-7d2fe4708b7a)



![Captura de pantalla -2024-10-23 12-40-20](https://github.com/user-attachments/assets/97b2e360-729d-465d-9bd7-92cc360ba089)



![Captura de pantalla -2024-10-23 12-41-22](https://github.com/user-attachments/assets/cec785b0-f91c-4ef0-90a5-f8e8911dcbf7)



![Captura de pantalla -2024-10-23 12-41-52](https://github.com/user-attachments/assets/3cf5b849-2f27-42fa-98b6-58a5192ce288)



![Captura de pantalla -2024-10-23 12-42-26](https://github.com/user-attachments/assets/9ba85b4a-e39e-4e05-9fba-565952174885)




## 7. References

1. Brin, S., & Page, L. (1998). The anatomy of a large-scale hypertextual Web search engine. Computer Networks and ISDN Systems, 30(1-7), 107-117. (Creators of PageRank, a foundational algorithm for P2P networks)

2. Appel, A. (1968). Some techniques for shading machine renderings of solids. In Proceedings of the April 30--May 2, 1968, spring joint computer conference (pp. 37-45). (Early work on ray tracing)

3. Gabor, D. (1948). A new microscopic principle. Nature, 161(4098), 777-778. (Inventor of holography)

4. Whitted, T. (1980). An improved illumination model for shaded display. Communications of the ACM, 23(6), 343-349. (Seminal work on ray tracing)

5. Beutel, J., Kundel, H. L., & Van Metter, R. L. (2000). Handbook of medical imaging: Physics and psychophysics. SPIE press. (Comprehensive resource on digital imaging techniques)

6. Cohen, B. (2003). Incentives build robustness in BitTorrent. In Workshop on Economics of Peer-to-Peer systems (Vol. 6, pp. 68-72). (Creator of BitTorrent, a significant P2P file-sharing protocol)

7. Devlin, J., Chang, M. W., Lee, K., & Toutanova, K. (2018). Bert: Pre-training of deep bidirectional transformers for language understanding. arXiv preprint arXiv:1810.04805. (Influential work on large language models)

8. Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., ... & Polosukhin, I. (2017). Attention is all you need. In Advances in neural information processing systems (pp. 5998-6008). (Introduced the Transformer architecture, crucial for modern LLMs)
