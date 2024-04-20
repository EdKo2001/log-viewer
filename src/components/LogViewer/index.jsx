import React, { useState, useEffect, useRef } from "react";

import styles from "./style.module.css";

function LogViewer() {
  const [log, setLog] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const logViewContainerRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const fetchDataViaHTTP = async () => {
      try {
        const response = await fetch(process.env.REACT_APP_HTTP_API);

        const decoder = new TextDecoder();
        const CHUNK_SIZE = 30;
        const reader = response.body.getReader();

        const readChunk = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              let offset = 0;
              while (offset < value.length) {
                const chunk = value.slice(offset, offset + CHUNK_SIZE);
                const chunkString = decoder.decode(chunk, { stream: true });

                setLog((prevLog) => prevLog + chunkString);

                offset += CHUNK_SIZE;
              }

              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          } catch (error) {
            console.error("Error reading stream:", error);
          }
        };

        readChunk();
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    const fetchDataViaWebSocket = () => {
      const newSocket = new WebSocket(process.env.REACT_APP_WSS_API);

      newSocket.addEventListener("message", (event) => {
        const newLog = event.data;

        setLog((prevLog) => prevLog + newLog);
      });

      newSocket.addEventListener("error", (error) => {
        console.error(`WebSocket error: ${error.message}`);
      });

      socketRef.current = newSocket;
    };

    fetchDataViaHTTP();
    fetchDataViaWebSocket();

    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      logViewContainerRef.current.scrollTop =
        logViewContainerRef.current.scrollHeight;
    });
  };

  const toggleAutoScroll = () => {
    setAutoScroll((prevAutoScroll) => {
      if (!prevAutoScroll) {
        scrollToBottom();
      }
      return !prevAutoScroll;
    });
  };

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [log, autoScroll]);

  return (
    <div className={styles.app}>
      <div className={styles["log-view-box"]}>
        <button
          type="button"
          className={`${styles["log-view-auto-scroll-btn"]}${
            autoScroll ? ` ${styles["log-view-auto-scroll-btn-active"]}` : ""
          }`}
          onClick={toggleAutoScroll}
        />
        <div className={styles["log-view-container"]} ref={logViewContainerRef}>
          {log === "" ? (
            <div className={styles["log-view-line"]}>Loading...</div>
          ) : (
            log.split("\n").map((line, index) => (
              <div
                key={index}
                className={styles["log-view-line"]}
                style={{ top: `${index * 32}px` }}
              >
                {line}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default LogViewer;
