'use client'

import type React from 'react'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  X,
  FastForward,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const slides = [
  {
    title: 'Welcome to UNO!',
    content:
      'match cards by color or number and be the first to get rid of them all.',
    cardImage: '/cards/Yellow- 1.svg?height=200&width=140',
  },
  {
    title: 'Action Cards',
    content:
      'action cards will mix the game up! draw two forces the next player to pick two cards and forfeit the turn',
    cardImage: '/cards/Yellow Draw2- 1.svg?height=200&width=140',
  },
  {
    title: 'Skip Card',
    content: 'skip card makes next player lose their turn',
    cardImage: '/cards/Yellow Skip- 1.svg?height=200&width=140',
  },
  {
    title: 'Reverse Card',
    content:
      'reverse card reverses play direction. in 2-player games, it acts like a skip',
    cardImage: '/cards/Yellow Reverse- 1.svg?height=200&width=140',
  },
  {
    title: 'Wild Card',
    content:
      'wild card is playable on any card and allows you to pick the next color',
    cardImage: '/cards/Wild- 1.svg?height=200&width=140',
  },
  {
    title: 'Wild Draw Four Card',
    content:
      'wild draw four allows you to pick the color and force next player to pick four cards. to use it you must have no other alternative cards to play',
    cardImage: '/cards/Draw4- 1.svg?height=200&width=140',
  },
  {
    title: 'UNO Rule',
    content:
      "don't forget to press uno when down to one card, or you will have to pick up 2 penalty cards",
    cardImage: '/uno.svg?height=200&width=140',
  },
]

export default function UnoNavbar() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const touchStartX = e.touches[0].clientX

    const handleTouchEnd = (endEvent: TouchEvent) => {
      const touchEndX = endEvent.changedTouches[0].clientX
      const diff = touchStartX - touchEndX

      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          nextSlide()
        } else {
          prevSlide()
        }
      }

      document.removeEventListener('touchend', handleTouchEnd)
    }

    document.addEventListener('touchend', handleTouchEnd)
  }

  return (
    <div className="min-h-fit bg-slate-700">
      {/* Navbar */}
      <nav className="bg-transparent shadow-sm border-b px-6 py-2">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* UNO Logo */}
          <Link href="/" className="flex items-center cursor-pointer">
            <Image src="/uno.svg" alt="UNO Logo" width={80} height={60} />
          </Link>

          {/* Light Bulb Icon */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsModalOpen(true)}
            className="hover:bg-yellow-100 cursor-pointer"
          >
            <Lightbulb className="h-6 w-6 text-yellow-600" />
          </Button>
        </div>
      </nav>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className="max-w-6xl w-full h-[600px] bg-slate-800 text-white border-0 p-0 overflow-hidden"
          onTouchStart={handleTouchStart}
          showCloseButton={false}
        >
          {/* Accessibility Title */}
          <DialogTitle className="sr-only">
            UNO Game Rules - {slides[currentSlide].title}
          </DialogTitle>

          <div className="relative h-full flex items-center justify-center">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-white hover:bg-slate-700 z-10"
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Previous Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={prevSlide}
              className="absolute left-6 top-1/2 -translate-y-1/2 text-white hover:bg-slate-700 z-10"
              disabled={currentSlide === 0}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>

            {/* Next Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={nextSlide}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-white hover:bg-slate-700 z-10"
              disabled={currentSlide === slides.length - 1}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>

            {/* Slide Content - Made wider with more spacing */}
            <div className="relative flex items-center justify-center w-full h-full px-32 py-12">
              {/* Card Image - More space from edge */}
              <div className="absolute left-32 top-1/2 -translate-y-1/2 flex-shrink-0">
                <Image
                  src={slides[currentSlide].cardImage || '/placeholder.svg'}
                  alt="UNO Card"
                  width={140}
                  height={200}
                  className="rounded-md"
                />
              </div>

              {/* Text Content - More space and wider container */}
              <div className="absolute left-80 right-20 top-1/2 -translate-y-1/2 space-y-4">
                <h2 className="text-2xl font-bold text-white">
                  {slides[currentSlide].title}
                </h2>
                <p className="text-base leading-relaxed text-gray-200">
                  {slides[currentSlide].content}
                </p>
              </div>
            </div>

            {/* Fast Forward Icon */}
            {currentSlide < slides.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentSlide(slides.length - 1)}
                className="absolute bottom-4 right-4 text-white hover:bg-slate-700"
              >
                <FastForward className="h-6 w-6" />
              </Button>
            )}

            {/* Slide Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentSlide ? 'bg-white' : 'bg-gray-500'
                  }`}
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
