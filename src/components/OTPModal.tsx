import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface OTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (otp: string) => void;
  onResend: () => void;
  email: string;
}

const OTPModal: React.FC<OTPModalProps> = ({ isOpen, onClose, onVerify, onResend, email }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(60); // 1 minute
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setOtp(['', '', '', '', '', '']);
      setTimeLeft(60);
      setCanResend(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(0, 1);
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length === 6) {
      onVerify(otpString);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="relative overflow-hidden p-5 bg-gradient-to-r from-[#3f4c6b] to-[#606c88] rounded-lg shadow-lg max-w-sm w-full mx-4">
        <button 
          onClick={onClose}
          className="absolute right-2.5 top-2.5 bg-[#3f4c6b] h-7.5 w-7.5 grid place-items-center rounded-full cursor-pointer font-semibold transition-all hover:bg-red-600 border-none text-white"
        >
          ×
        </button>
        
        <form onSubmit={handleSubmit} className="flex flex-col items-center w-full">
          <div className="mb-5 text-center">
            <span className="text-white text-2xl font-bold leading-snug tracking-tight block">
              OTP Verification
            </span>
            <p className="text-white mt-2.5 text-sm leading-relaxed">
              Please enter the code we have sent to {email}
            </p>
          </div>
          
          <div className="flex justify-between gap-2.5 mb-5">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                autoComplete="off"
                className="h-10 w-10 outline-none text-center text-xl text-white rounded border border-white/30 bg-white/5 focus:border-blue-500"
              />
            ))}
          </div>
          
          <Button 
            type="submit" 
            disabled={otp.join('').length !== 6}
            className="bg-[#606c88] px-5 py-2.5 mt-2 text-xs font-semibold rounded-lg transition-all hover:bg-[#3f4c6b] w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Verify
          </Button>
          
          <div className="mt-5">
            <p className="text-white text-sm text-center">
              You don't receive the code?{' '}
              {canResend ? (
                <button 
                  onClick={onResend}
                  className="bg-none border-none text-white font-semibold cursor-pointer underline hover:text-blue-400"
                >
                  Resend
                </button>
              ) : (
                <span className="text-blue-400 font-semibold">{formatTime(timeLeft)}</span>
              )}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OTPModal;
