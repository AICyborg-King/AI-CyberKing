import React from 'react';
import { ArrowRight } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  colorClass?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ 
  title, 
  description, 
  icon: Icon, 
  onClick,
  colorClass = "bg-white"
}) => {
  return (
    <div 
      onClick={onClick}
      className={`relative group cursor-pointer p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 ${colorClass}`}
    >
      <div className="absolute top-6 right-6 text-gray-300 group-hover:text-primary-500 transition-colors">
        <ArrowRight size={24} />
      </div>
      
      <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        <Icon className="text-primary-600" size={24} />
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
};