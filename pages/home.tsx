import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { Card } from '../components/common';
import Button from '../components/ui/Button';
import Link from 'next/link';

const Home: React.FC = () => {
  const [weather, setWeather] = useState<{temp: number; description: string} | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
        const city = 'Council Bluffs';
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=imperial`);
        const data = await response.json();
        setWeather({
          temp: data.main.temp,
          description: data.weather[0].description,
        });
      } catch (error) {
        console.error('Error fetching weather:', error);
      }
    };

    fetchWeather();
  }, []);

  return (
    <Layout title="Welcome to SureSight">
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-4xl font-bold mb-6">SureSight</h1>
          <p className="text-lg mb-8">Your easy tool for property inspections and reports.</p>
            
          {weather && (
            <Card className="mx-auto max-w-md mb-8">
              <div className="p-6">
                <h2 className="text-xl font-medium">Today's Weather</h2>
                  <p className="text-2xl mt-2">{weather.temp}°F</p>
                  <p className="text-gray-600 capitalize">{weather.description}</p>
              </div>
            </Card>
          )}
          
        </div>
    </Layout>
  );
};

export default Home;
