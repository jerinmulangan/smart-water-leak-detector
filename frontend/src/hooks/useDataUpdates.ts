import { useEffect, useRef } from "react";
import { PipelineData } from "../types";
import { generateRandomTemperature } from "../utils/temperatureUtils";
import { getSystemStatus } from "../utils/flowUtils";

export function useDataUpdates(
  setPipelineData: React.Dispatch<React.SetStateAction<PipelineData[]>>
) {
  const wsRef = useRef<WebSocket | null>(null); // Keep WebSocket instance across renders
  const reconnectTimeout = useRef<any>(null); // Ref to manage reconnection timeout

  useEffect(() => {
    const connectWebSocket = () => {
      console.log("Attempting to connect WebSocket...");
      wsRef.current = new WebSocket("ws://localhost:3000"); // Replace with your WebSocket URL

      wsRef.current.onopen = () => {
        console.log("WebSocket connection established.");
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current); // Clear any pending reconnection attempts
        }
      };

      wsRef.current.onmessage = (message) => {
        try {
          const receivedData = JSON.parse(message.data);
          setPipelineData((currentData) =>
            currentData.map((data) => {
              const flowRate1 = receivedData.end1Pressure;
              const flowRate2 = receivedData.end2Pressure;
              const temperature = generateRandomTemperature();
              const { status } = getSystemStatus(Math.abs(flowRate1 - flowRate2));

              return {
                ...data,
                flowRate1,
                flowRate2,
                temperature,
                status,
                timestamp: new Date().toISOString(),
              };
            })
          );
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket connection closed.");
        attemptReconnect(); // Attempt to reconnect after the connection closes
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        wsRef.current?.close(); // Close the WebSocket and trigger reconnection
      };
    };

    const attemptReconnect = () => {
      console.log("Reconnecting WebSocket...");
      if (!reconnectTimeout.current) {
        reconnectTimeout.current = setTimeout(() => {
          connectWebSocket();
        }, 5000); // Retry connection after 5 seconds
      }
    };

    connectWebSocket(); // Initial WebSocket connection attempt

    // Cleanup function to close WebSocket on unmount and clear reconnect timeout
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [setPipelineData]); // Dependency array ensures it runs once when the component mounts

}
