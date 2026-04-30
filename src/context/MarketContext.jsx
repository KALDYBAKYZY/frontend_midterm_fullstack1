import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import api from "../api/axios";

const MarketContext = createContext(null);

export const MarketProvider = ({ children }) => {
  const { token } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const fetchStocks = async () => {
    try {
      const res = await api.get("/stocks");
      setStocks(res.data);
    } catch (err) {
      console.error("Failed to fetch stocks");
    }
  };

  const updatePrice = ({ ticker, price }) => {
    setStocks((prev) =>
      prev.map((s) =>
        s.ticker === ticker
          ? { ...s, price }
          : s
      )
    );
  };

  useEffect(() => {
    if (token) {
      fetchStocks();
    }
  }, [token]);

  useEffect(() => {
    if (!token){ 
      return;
    }
    const wsUrl =
      import.meta.env.VITE_WS_URL || "ws://localhost:5000";

    const socket = new WebSocket(wsUrl, token);
    socketRef.current = socket;
    let interval = null;

    socket.onopen = () => {
      setConnected(true);

      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "TICKER_UPDATE") {
          updatePrice(data.payload);
        }
      } catch (err) {
        console.error(err);
      }
    };

    socket.onclose = () => {
      setConnected(false);

      interval = setInterval(() => {
        fetchStocks();
      }, 2000);
    };

    socket.onerror = () => {
      setConnected(false);
    };

    return () => {
      socket.close();

      if (interval) {
        clearInterval(interval);
      }
    };
  }, [token]);

  return (
    <MarketContext.Provider
      value={{
        stocks,
        connected,
        fetchStocks,
      }}> {children} </MarketContext.Provider>
  );
};

export const useMarket = () => useContext(MarketContext);