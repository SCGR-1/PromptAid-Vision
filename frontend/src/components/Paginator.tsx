import React from 'react';
import { Button, Container } from '@ifrc-go/ui';
import { ChevronLeftLineIcon, ChevronRightLineIcon } from '@ifrc-go/icons';
import styles from './Paginator.module.css';

interface PaginatorProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Paginator({
  currentPage,
  totalPages,
  onPageChange,
  className = ''
}: PaginatorProps) {

  // Don't render if only one page
  if (totalPages <= 1) {
    return null;
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show smart range of pages
      let start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      // Adjust start if we're near the end
      if (end === totalPages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`${styles.paginatorContainer} ${className}`}>
             {/* Pagination controls */}
       <div className={styles.paginationControls}>
         {/* Previous button */}
         <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
           <Button
             name="prev-page"
             variant="tertiary"
             size={1}
             onClick={() => onPageChange(Math.max(1, currentPage - 1))}
             disabled={currentPage === 1}
             title="Previous page"
           >
             <ChevronLeftLineIcon className="w-4 h-4" />
             <span className="hidden sm:inline">Previous</span>
           </Button>
         </Container>

         {/* Page numbers */}
         <div className="flex items-center gap-1">
           {/* First page (if not visible) */}
           {pageNumbers[0] > 1 && (
             <>
               <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
                 <Button
                   name="page-1"
                   variant="tertiary"
                   size={1}
                   onClick={() => onPageChange(1)}
                 >
                   1
                 </Button>
               </Container>
               {pageNumbers[0] > 2 && (
                 <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
                   <span className="px-2 text-gray-500">...</span>
                 </Container>
               )}
             </>
           )}

           {/* Visible page numbers */}
           {pageNumbers.map(pageNum => (
             <Container key={pageNum} withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
               <Button
                 name={`page-${pageNum}`}
                 variant={currentPage === pageNum ? "primary" : "tertiary"}
                 size={1}
                 onClick={() => onPageChange(pageNum)}
               >
                 {pageNum}
               </Button>
             </Container>
           ))}

           {/* Last page (if not visible) */}
           {pageNumbers[pageNumbers.length - 1] < totalPages && (
             <>
               {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                 <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
                   <span className="px-2 text-gray-500">...</span>
                 </Container>
               )}
               <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
                 <Button
                   name={`page-${totalPages}`}
                   variant="tertiary"
                   size={1}
                   onClick={() => onPageChange(totalPages)}
                 >
                   {totalPages}
                 </Button>
               </Container>
             </>
           )}
         </div>

         {/* Next button */}
         <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
           <Button
             name="next-page"
             variant="tertiary"
             size={1}
             onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
             disabled={currentPage === totalPages}
             title="Next page"
           >
             <span className="hidden sm:inline">Next</span>
             <ChevronRightLineIcon className="w-4 h-4" />
           </Button>
         </Container>
       </div>
    </div>
  );
}
