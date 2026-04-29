import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import api from "../api/axios";

const MarketContext = createContext(null);

export const MarketProvider = ({ children }) => {
  const { token } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  // Load all stocks from REST
  const fetchStocks = async () => {
    try {
      const res = await api.get("/stocks");
      setStocks(res.data);
    } catch (err) {
      console.error("Failed to fetch stocks");
    }
  };

  // Update a single stock price in state (from WS)
  const updatePrice = ({ ticker, price, id }) => {
    setStocks((prev) =>
      prev.map((s) =>
        s.ticker === ticker ? { ...s, price } : s
      )
    );
  };

  // WebSocket: connect when token is available
  useEffect(() => {
    if (!token) return;

    fetchStocks();

    // Pass JWT as Sec-WebSocket-Protocol header
    const socket = new WebSocket("ws://localhost:5000", token);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "TICKER_UPDATE") {
          updatePrice(data.payload);
        }
      } catch (e) {
        console.error("WS parse error", e);
      }
    };

    socket.onclose = () => {
      setConnected(false);
    };

    socket.onerror = (err) => {
      console.error("WS error", err);
      setConnected(false);
    };

    return () => {
      socket.close();
    };
  }, [token]);

  return (
    <MarketContext.Provider value={{ stocks, connected, fetchStocks }}>
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => useContext(MarketContext);
