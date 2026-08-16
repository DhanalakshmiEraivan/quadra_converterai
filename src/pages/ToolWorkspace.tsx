import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ComponentType,
} from 'react';

import {
  ArrowLeft,
  Download,
  Sparkles,
  CheckCircle2,
  FileCheck2,
  RefreshCw,
  Star,
  Clock,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Settings2,
  Mail,
  Share2,
  Eye,
} from 'lucide-react';

import * as Icons from 'lucide-react';

import type { Tool, ToolOption } from '@/data/tools';
import * as Converters from '@/lib/converters';
import * as PDFConverters from '@/lib/pdf-converters';
import { consumeConversion, refundConversion } from '@/lib/usage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type Props = {
  tool: Tool;
  navigate: (path: string) => void;
};

type Stage = 'idle' | 'working' | 'done' | 'error';

export function ToolWorkspace({ tool, navigate }: Props) {
  const { user } = useAuth();

  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);

  const [results, setResults] = useState<Converters.ConvertResult[]>([]);
  const [storedFiles, setStoredFiles] = useState<File[]>([]);

  const [options, setOptions] = useState<
    Record<string, string | number | boolean>
  >(() => {
    const defaults: Record<string, string | number | boolean> = {};

    tool.options?.forEach((option) => {
      defaults[option.key] = option.default;
    });

    return defaults;
  });

  const [userRequirement, setUserRequirement] = useState('');
  const [requirementMessage, setRequirementMessage] = useState('');

  const [progress, setProgress] = useState(0);

  const [previewResult, setPreviewResult] =
    useState<Converters.ConvertResult | null>(null);

  const [emailResult, setEmailResult] =
    useState<Converters.ConvertResult | null>(null);

  const [emailAddress, setEmailAddress] = useState('');
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);

  const [dragOver, setDragOver] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  /*
   * ---------------------------------------------------------
   * ICON
   * ---------------------------------------------------------
   */

  const getIcon = (name: string) => {
    const Icon = (
      Icons as unknown as Record<string, ComponentType<{ className?: string }>>
    )[name];

    return Icon ? (
      <Icon className="h-5 w-5" />
    ) : (
      <Icons.FileText className="h-5 w-5" />
    );
  };

  /*
   * ---------------------------------------------------------
   * UPDATE OPTION
   * ---------------------------------------------------------
   */

  const updateOption = (
    key: string,
    value: string | number | boolean
  ) => {
    setOptions((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  /*
   * ---------------------------------------------------------
   * RUN CONVERSION
   * ---------------------------------------------------------
   */

  const executeConversion = async (
    files: File[],
    opts: Record<string, string | number | boolean>
  ): Promise<Converters.ConvertResult | Converters.ConvertResult[]> => {
    const first = files[0];

    const text = (key = 'text') => String(opts[key] ?? '').trim();
    const num = (key: string, fallback = 0) => {
      const value = Number(opts[key]);
      return Number.isFinite(value) ? value : fallback;
    };
    const bool = (key: string, fallback = false) =>
      typeof opts[key] === 'boolean' ? Boolean(opts[key]) : fallback;

    switch (tool.engine) {
      // Image tools
      case 'imageToImage':
        return Converters.imageToImage(first, text('targetFormat'));
      case 'imageToPDF':
        return Converters.imageToPDF(first);
      case 'imageCompress':
        return Converters.imageCompress(first, {
          mode: text('mode') as 'target-size' | 'quality' | 'balanced',
          targetSize: num('targetSize', 200),
          targetUnit: text('targetUnit') as 'KB' | 'MB',
          quality: num('quality', 85),
          format: text('format') as 'auto' | 'jpg' | 'webp' | 'png',
          preserveDimensions: bool('preserveDimensions', true),
        });
      case 'imageResize':
        return Converters.imageResize(first, {
          mode: text('mode') as 'dimensions' | 'percentage' | 'long-edge',
          width: num('width', 1080),
          height: num('height', 1080),
          percentage: num('percentage', 50),
          longEdge: num('longEdge', 1200),
          fitMode: text('fitMode') as 'fit' | 'fill' | 'stretch',
          preserveAspectRatio: bool('preserveAspectRatio', true),
        });
      case 'imageRotate':
        return Converters.imageRotate(first, {
          degrees: num('degrees', 90),
          direction: text('direction') as 'clockwise' | 'counterclockwise',
          expand: bool('expand', true),
        });
      case 'imageGrayscale':
        return Converters.imageGrayscale(first);
      case 'imageFlip':
        return Converters.imageFlip(first, text('axis') as 'h' | 'v');
      case 'imageToBase64':
        return Converters.imageToBase64(first);
      case 'imageCropToSquare':
        return Converters.imageCropToSquare(first, {
          position: text('position') as 'center' | 'top' | 'bottom' | 'left' | 'right',
          size: num('size', 1080),
        });

      // PDF creation / manipulation
      case 'pdfToImages':
        return Converters.pdfToImages(first, text('pageRange') || 'all');
      case 'imagesToPDF':
        return PDFConverters.imagesToPDF(files);
      case 'mergePDFs':
        return PDFConverters.mergePDFs(files);
      case 'splitPDF':
        return PDFConverters.splitPDF(first, text('splitPoints'));
      case 'textToPDF':
        return PDFConverters.textToPDF(text('text'), `${tool.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      case 'htmlToPDF':
        return PDFConverters.htmlToPDF(text('text'), `${tool.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      case 'pdfRemovePages':
        return PDFConverters.removePages(first, text('pageRange'));
      case 'pdfExtractPages':
        return PDFConverters.extractPages(first, text('pageRange'));
      case 'pdfOrganize':
        return PDFConverters.organizePDF(first, text('pageOrder'));
      case 'pdfScanToPDF':
        return PDFConverters.scanToPDF(files);
      case 'pdfOptimize':
        return PDFConverters.optimizePDF(first);
      case 'pdfCompress':
        return PDFConverters.compressPDF(first, num('quality', 75));
      case 'pdfRepair':
        return PDFConverters.repairPDF(first);
      case 'pdfOCR':
        return PDFConverters.ocrPDF(first, text('language') || 'eng');
      case 'pdfConvertTo':
        return PDFConverters.convertToPDF(first);
      case 'pdfJpgToPDF':
        return PDFConverters.jpgToPDF(files);
      case 'pdfWordToPDF':
        return PDFConverters.wordToPDF(first);
      case 'pdfPptxToPDF':
        return PDFConverters.pptxToPDF(first);
      case 'pdfExcelToPDF':
        return PDFConverters.excelToPDF(first);
      case 'pdfHtmlFileToPDF':
        return PDFConverters.htmlToPDFFile(first);
      case 'pdfToJPG':
        return PDFConverters.pdfToJPG(first, num('quality', 90), text('pageRange') || 'all');
      case 'pdfToWord':
        return PDFConverters.pdfToWord(first);
      case 'pdfToPPTX':
        return PDFConverters.pdfToPPTX(first);
      case 'pdfToExcel':
        return PDFConverters.pdfToExcel(first);
      case 'pdfToPDFA':
        return PDFConverters.pdfToPDFA(first);
      case 'pdfRotate':
        return PDFConverters.rotatePDF(first, num('degrees', 90));
      case 'pdfAddPageNumbers':
        return PDFConverters.addPageNumbers(first, text('position') || 'bottom-center');
      case 'pdfAddWatermark':
        return PDFConverters.addWatermark(first, text('text'), num('opacity', 0.25));
      case 'pdfCrop':
        return PDFConverters.cropPDF(first, num('margin', 20));
      case 'pdfFlatten':
        return PDFConverters.flattenPDF(first);
      case 'pdfUnlock':
        return PDFConverters.unlockPDF(first, text('password'));
      case 'pdfProtect':
        return PDFConverters.protectPDF(first, text('password'));
      case 'pdfSign':
        return PDFConverters.signPDF(first, text('name'));
      case 'pdfRedact':
        return PDFConverters.redactPDF(first, text('searchText'));
      case 'pdfCompare':
        if (files.length < 2) throw new Error('Please upload two PDF files to compare.');
        return PDFConverters.comparePDF(files[0], files[1]);
      case 'pdfSummarize':
        return PDFConverters.summarizePDF(first, num('ratio', 0.25));
      case 'pdfTranslate':
        return PDFConverters.translatePDF(first, text('targetLang') || 'en');
      case 'pdfToMarkdown':
        return PDFConverters.pdfToMarkdown(first);

      // Text / developer tools
      case 'textCaseConvert':
        return Converters.textCaseConvert(text('text'), text('mode'));
      case 'textToBase64':
        return Converters.textToBase64(text('text'));
      case 'base64ToText':
        return Converters.base64ToText(text('text'));
      case 'textToBinary':
        return Converters.textToBinary(text('text'));
      case 'binaryToText':
        return Converters.binaryToText(text('text'));
      case 'textToHex':
        return Converters.textToHex(text('text'));
      case 'hexToText':
        return Converters.hexToText(text('text'));
      case 'textToMorse':
        return Converters.textToMorse(text('text'));
      case 'morseToText':
        return Converters.morseToText(text('text'));
      case 'textToLeet':
        return Converters.textToLeet(text('text'));
      case 'textRemoveDuplicates':
        return Converters.textRemoveDuplicates(text('text'));
      case 'textWordCount':
        return Converters.textWordCount(text('text'));
      case 'textFindReplace':
        return Converters.textFindReplace(text('text'), text('find'), text('replace'));
      case 'textSortLines':
        return Converters.textSortLines(text('text'), text('mode'));
      case 'textTrimLines':
        return Converters.textTrimLines(text('text'));
      case 'textAddLineNumbers':
        return Converters.textAddLineNumbers(text('text'));
      case 'textSlugify':
        return Converters.textSlugify(text('text'));
      case 'textLoremIpsum':
        return Converters.textLoremIpsum(num('paragraphs', 3));
      case 'jsonBeautify':
        return Converters.jsonBeautify(text('json'), num('indent', 2));
      case 'jsonMinify':
        return Converters.jsonMinify(text('json'));
      case 'jsonToCSV':
        return Converters.jsonToCSV(text('json'));
      case 'csvToJSON':
        return Converters.csvToJSON(text('text'));
      case 'jsonToYAML':
        return Converters.jsonToYAML(text('json'));
      case 'urlEncode':
        return Converters.urlEncode(text('text'));
      case 'urlDecode':
        return Converters.urlDecode(text('text'));
      case 'htmlEncode':
        return Converters.htmlEncode(text('text'));
      case 'htmlDecode':
        return Converters.htmlDecode(text('text'));
      case 'htmlToMarkdown':
        return Converters.htmlToMarkdown(text('text'));
      case 'markdownToHTML':
        return Converters.markdownToHTML(text('text'));
      case 'generateQRCode':
        return Converters.generateQRCode(text('text'), num('size', 512));
      case 'generateQRCodeSVG':
        return Converters.generateQRCodeSVG(text('text'));
      case 'colorConverter':
        return Converters.colorConverter(text('text'));
      case 'calculatePercentage':
        return Converters.calculatePercentage(text('value'), text('total'));
      case 'calculateBMI':
        return Converters.calculateBMI(text('weight'), text('height'));
      case 'calculateAge':
        return Converters.calculateAge(text('birthDate'));
      case 'calculateLoan':
        return Converters.calculateLoan(text('principal'), text('rate'), text('years'));
      case 'calculateUnit':
        return Converters.calculateUnit(text('value'), text('from'), text('to'), text('type'));
      case 'calculateTimezones':
        return Converters.calculateTimezones(text('timezone'));
      case 'generateHash':
        return Converters.generateHash(text('text'), text('algorithm') || 'SHA-256');
      case 'generateUUID':
        return Converters.generateUUID();
      case 'generatePassword':
        return Converters.generatePassword(num('length', 16), {
          upper: bool('upper', true),
          lower: bool('lower', true),
          numbers: bool('numbers', true),
          symbols: bool('symbols', true),
        });
      default:
        throw new Error(`No converter is registered for tool engine "${tool.engine}".`);
    }
  };

  const runConversion = async (files?: File[]) => {
    const useFiles = files && files.length > 0 ? files : storedFiles;

    if (
      (tool.inputType === 'file' ||
        tool.inputType === 'multi-file' ||
        tool.inputType === 'file-options') &&
      useFiles.length === 0
    ) {
      setError('Please upload a file first.');
      setStage('error');
      return;
    }

    if (stage === 'working') return;

    if (!user) {
      setError('Please sign in before starting a conversion. Your free conversion credits are tied to your account.');
      setStage('error');
      return;
    }

    let reservationId: string | null = null;

    try {
      const reservation = await consumeConversion();

      if (!reservation.allowed) {
        setError(
          reservation.message ||
            `You have reached your daily free conversion limit. Please upgrade to continue.`
        );
        setStage('error');
        return;
      }

      reservationId = reservation.unlimited ? null : (reservation.reservation_id ?? null);

      if (!reservation.unlimited && !reservationId) {
        throw new Error('The conversion credit could not be reserved safely. Please try again.');
      }
    } catch (usageError) {
      console.error('Conversion credit reservation failed:', usageError);
      setError(
        usageError instanceof Error
          ? usageError.message
          : 'Unable to reserve a conversion credit.'
      );
      setStage('error');
      return;
    }

    setStage('working');
    setError(null);
    setProgress(8);

    try {
      const opts = options as Record<string, string | number | boolean>;
      const output = await executeConversion(useFiles, opts);

      if (!output) {
        throw new Error('The converter did not return a result.');
      }

      const resultArr = Array.isArray(output) ? output : [output];

      const validResults = resultArr.filter(
        (result) => result && result.blob instanceof Blob && result.blob.size > 0 && result.filename
      );

      if (validResults.length === 0) {
        throw new Error('The conversion completed but returned no usable output file.');
      }

      setProgress(100);
      setResults(validResults);

      if (user) {
        const firstResult = validResults[0];
        const { error: insertError } = await supabase.from('conversions').insert({
          tool_id: tool.id,
          tool_name: tool.name,
          category: tool.category,
          input_name: useFiles.length > 0 ? useFiles[0].name : 'text-input',
          output_name: firstResult.filename,
          output_format: tool.outputFormat,
          status: 'completed',
          file_size: firstResult.blob.size,
        });

        if (insertError) {
          console.error('Failed to save conversion history:', insertError);
        }
      }

      setTimeout(() => setStage('done'), 150);
    } catch (err: unknown) {
      console.error('Conversion error:', err);

      const message = err instanceof Error ? err.message : 'Conversion failed.';
      setError(message);
      setStage('error');

      if (reservationId) {
        try {
          await refundConversion(reservationId);
        } catch (refundError) {
          console.error('Failed to refund conversion credit:', refundError);
        }
      }

      if (user) {
        const { error: insertError } = await supabase.from('conversions').insert({
          tool_id: tool.id,
          tool_name: tool.name,
          category: tool.category,
          input_name: useFiles.length > 0 ? useFiles[0].name : 'text-input',
          output_name: '',
          output_format: tool.outputFormat,
          status: 'failed',
          file_size: null,
        });
        if (insertError) console.error('Failed to save failed conversion history:', insertError);
      }
    }
  };

  /*
   * ---------------------------------------------------------
   * FILE HANDLING
   * ---------------------------------------------------------
   */

 const handleFiles = useCallback(
  (files: FileList | File[]) => {
    const fileArr = Array.from(files);

    if (fileArr.length === 0) {
      return;
    }

    setStoredFiles(fileArr);
    setResults([]);
    setError(null);
    setStage('idle');
    setProgress(0);

    /*
     * Existing QuadraConverter behaviour:
     * normal file tools automatically start after upload.
     */
    if (
      tool.inputType === 'file' ||
      tool.inputType === 'multi-file'
    ) {
      void runConversion(fileArr);
    }
  },
  [tool]
);
  /*
   * ---------------------------------------------------------
   * DOWNLOAD
   * ---------------------------------------------------------
   */

  const handleDownload = (
    result: Converters.ConvertResult
  ) => {
    Converters.downloadBlob(
      result.blob,
      result.filename
    );
  };

  const handleDownloadAll = () => {
    results.forEach((result, index) => {
      setTimeout(() => {
        Converters.downloadBlob(
          result.blob,
          result.filename
        );
      }, index * 200);
    });
  };

  /*
   * ---------------------------------------------------------
   * PREVIEW
   * ---------------------------------------------------------
   */

  const handlePreview = (
    result: Converters.ConvertResult
  ) => {
    setPreviewResult(result);
  };

  /*
   * ---------------------------------------------------------
   * SHARE
   * ---------------------------------------------------------
   */

  const handleShare = (
    result: Converters.ConvertResult,
    method: 'email' | 'whatsapp'
  ) => {
    const subject =
      `Converted file: ${result.filename}`;

    const body =
      `I converted a file using ${tool.name}.\n\n` +
      `File: ${result.filename}\n` +
      `Size: ${(result.blob.size / 1024).toFixed(1)} KB\n\n` +
      `Download it from QuadraConverter.`;

    if (method === 'whatsapp') {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(
          subject + '\n\n' + body
        )}`,
        '_blank',
        'noopener,noreferrer'
      );

      return;
    }

    setEmailResult(result);
    setEmailAddress('');
    setEmailStatus(null);
  };

  /*
   * ---------------------------------------------------------
   * RESET
   * ---------------------------------------------------------
   */

  const reset = () => {
    setStage('idle');
    setResults([]);
    setError(null);
    setProgress(0);
    setStoredFiles([]);
    setPreviewResult(null);
    setRequirementMessage('');
    setUserRequirement('');
  };

  /*
   * ---------------------------------------------------------
   * ADVANCED IMAGE REQUIREMENTS
   * ---------------------------------------------------------
   */

  const isAdvancedImageTool = [
    'img-compress',
    'img-resize',
    'img-rotate',
    'img-crop-square',
  ].includes(tool.id);

  const understandRequirement = () => {
    const text =
      userRequirement.trim().toLowerCase();

    if (!text) {
      setRequirementMessage(
        'Please describe what you want to do with the image.'
      );
      return;
    }

    setRequirementMessage('');

    /*
     * IMAGE COMPRESS
     */

    if (tool.id === 'img-compress') {
      const sizeMatch = text.match(
        /(\d+(?:\.\d+)?)\s*(kb|mb)/i
      );

      if (sizeMatch) {
        updateOption(
          'targetSize',
          Number(sizeMatch[1])
        );

        updateOption(
          'targetUnit',
          sizeMatch[2].toUpperCase()
        );

        updateOption(
          'mode',
          'target-size'
        );
      }

      if (text.includes('webp')) {
        updateOption('format', 'webp');
      } else if (text.includes('png')) {
        updateOption('format', 'png');
      } else if (
        text.includes('jpg') ||
        text.includes('jpeg')
      ) {
        updateOption('format', 'jpg');
      }

      if (
        text.includes('best quality') ||
        text.includes('maximum quality') ||
        text.includes('highest quality')
      ) {
        updateOption('quality', 95);
      }

      setRequirementMessage(
        'Requirement understood. Please review the settings below.'
      );

      return;
    }

    /*
     * IMAGE RESIZE
     */

    if (tool.id === 'img-resize') {
      const dimensionMatch = text.match(
        /(\d+)\s*[x×]\s*(\d+)/i
      );

      const percentageMatch = text.match(
        /(\d+)\s*%/i
      );

      const longEdgeMatch = text.match(
        /(?:longest|long)\s*(?:edge|side).*?(\d+)\s*(?:px|pixel)?/i
      );

      if (dimensionMatch) {
        updateOption(
          'mode',
          'dimensions'
        );

        updateOption(
          'width',
          Number(dimensionMatch[1])
        );

        updateOption(
          'height',
          Number(dimensionMatch[2])
        );
      } else if (percentageMatch) {
        updateOption(
          'mode',
          'percentage'
        );

        updateOption(
          'percentage',
          Number(percentageMatch[1])
        );
      } else if (longEdgeMatch) {
        updateOption(
          'mode',
          'long-edge'
        );

        updateOption(
          'longEdge',
          Number(longEdgeMatch[1])
        );
      }

      if (
        text.includes('without cropping') ||
        text.includes('no crop') ||
        text.includes('preserve aspect')
      ) {
        updateOption(
          'fitMode',
          'fit'
        );

        updateOption(
          'preserveAspectRatio',
          true
        );
      } else if (
        text.includes('crop') ||
        text.includes('fill')
      ) {
        updateOption(
          'fitMode',
          'fill'
        );
      }

      setRequirementMessage(
        'Requirement understood. Please review the settings below.'
      );

      return;
    }

    /*
     * IMAGE ROTATE
     */

    if (tool.id === 'img-rotate') {
      const degreeMatch = text.match(
        /(\d+(?:\.\d+)?)\s*(?:degree|degrees|°)/i
      );

      if (degreeMatch) {
        updateOption(
          'degrees',
          Number(degreeMatch[1])
        );
      }

      updateOption(
        'direction',
        text.includes('counter') ||
          text.includes('anticlockwise') ||
          text.includes('anti-clockwise') ||
          text.includes('left')
          ? 'counterclockwise'
          : 'clockwise'
      );

      setRequirementMessage(
        'Requirement understood. Please review the settings below.'
      );

      return;
    }

    /*
     * IMAGE CROP TO SQUARE
     */

    if (tool.id === 'img-crop-square') {
      if (text.includes('top')) {
        updateOption(
          'position',
          'top'
        );
      } else if (text.includes('bottom')) {
        updateOption(
          'position',
          'bottom'
        );
      } else if (text.includes('left')) {
        updateOption(
          'position',
          'left'
        );
      } else if (text.includes('right')) {
        updateOption(
          'position',
          'right'
        );
      } else {
        updateOption(
          'position',
          'center'
        );
      }

      const sizeMatch = text.match(
        /(\d+)\s*[x×]?\s*(?:px|pixel)/i
      );

      if (sizeMatch) {
        updateOption(
          'size',
          Number(sizeMatch[1])
        );
      }

      setRequirementMessage(
        'Requirement understood. Please review the settings below.'
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * INPUT TYPES
   * ---------------------------------------------------------
   */

  const needsFile =
    tool.inputType === 'file' ||
    tool.inputType === 'multi-file';

  const needsText =
    tool.inputType === 'text';

  const needsOptionsOnly =
    tool.inputType === 'none';

  const needsFileOptions =
    tool.inputType === 'file-options';

  /*
   * ---------------------------------------------------------
   * FILE DROP ZONE
   * ---------------------------------------------------------
   */

  const renderFileZone = (
    compact: boolean
  ) => (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => {
        setDragOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);

        handleFiles(
          event.dataTransfer.files
        );
      }}
      onClick={() =>
        inputRef.current?.click()
      }
      className={`
        group relative cursor-pointer overflow-hidden rounded-2xl
        border-2 border-dashed transition-all duration-300
        ${
          compact
            ? 'p-8'
            : 'p-10 sm:p-14'
        }
        ${
          dragOver
            ? 'border-brand-500 bg-brand-50/60 scale-[1.01]'
            : 'border-ink-200 bg-white hover:border-brand-400 hover:bg-brand-50/30'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={tool.accept || '*'}
        multiple={
          tool.inputType ===
          'multi-file'
        }
        className="hidden"
        onChange={(event) => {
          if (event.target.files) {
            handleFiles(
              event.target.files
            );
          }
        }}
      />

      <div className="relative flex flex-col items-center text-center">
        <div
          className={`
            grid place-items-center rounded-2xl
            bg-ink-800 text-white shadow-glow
            transition-transform group-hover:scale-105
            ${
              compact
                ? 'h-14 w-14'
                : 'h-16 w-16'
            }
          `}
        >
          <Icons.UploadCloud
            className={
              compact
                ? 'h-6 w-6'
                : 'h-7 w-7'
            }
            strokeWidth={2.2}
          />
        </div>

        <p
          className={`
            mt-3 font-display font-bold text-ink-900
            ${compact ? '' : 'text-lg'}
          `}
        >
          {storedFiles.length > 0
            ? `${storedFiles.length} file${
                storedFiles.length > 1
                  ? 's'
                  : ''
              } selected`
            : `Drag & drop ${
                tool.inputType ===
                'multi-file'
                  ? 'files'
                  : 'a file'
              } here`}
        </p>

        <p className="mt-1 text-ink-500 text-sm">
          {storedFiles.length > 0
            ? storedFiles
                .map(
                  (file) =>
                    file.name
                )
                .join(', ')
                .substring(0, 60)
            : 'or click to browse from your device'}
        </p>

        <p className="mt-2 text-xs text-ink-400">
          Accepts:{' '}
          {tool.accept ||
            'Any file type'}
        </p>
      </div>
    </div>
  );

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <div className="container-page py-8">
      <button
        onClick={() =>
          navigate('/tools')
        }
        className="flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-900 transition mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tools
      </button>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* TOOL HEADER */}

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-ink-100 text-ink-800 grid place-items-center shrink-0">
              {getIcon(tool.icon)}
            </div>

            <div>
              <h1 className="font-display text-2xl font-bold text-ink-900">
                {tool.name}
              </h1>

              <p className="text-ink-500 mt-0.5">
                {tool.description}
              </p>
            </div>
          </div>

          {/* MAIN CARD */}

          <div className="bg-white rounded-3xl border border-ink-200 shadow-card overflow-hidden">
            {/* IDLE */}

            {stage === 'idle' && (
              <div className="p-6 sm:p-8">
                {needsFile &&
                  renderFileZone(false)}

                {needsFileOptions && (
                  <>
                    {renderFileZone(true)}

                    {isAdvancedImageTool && (
                      <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50/40 p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4 text-brand-600" />

                          <p className="text-sm font-bold text-ink-900">
                            What do you want to achieve?
                          </p>
                        </div>

                        <p className="text-xs text-ink-500 mb-3">
                          Describe your requirement
                          in your own words. Quadra
                          will fill the advanced
                          settings for you.
                        </p>

                        <textarea
                          value={
                            userRequirement
                          }
                          onChange={(event) =>
                            setUserRequirement(
                              event.target.value
                            )
                          }
                          placeholder={
                            tool.id ===
                            'img-compress'
                              ? 'Example: Compress this image below 200 KB while keeping the best possible quality.'
                              : tool.id ===
                                'img-resize'
                              ? 'Example: Resize this image to 1080x1080 without cropping.'
                              : tool.id ===
                                'img-rotate'
                              ? 'Example: Rotate this image 25 degrees clockwise.'
                              : 'Example: Crop this image to a 1080x1080 square from the top.'
                          }
                          rows={3}
                          className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 resize-none"
                        />

                        <button
                          type="button"
                          onClick={
                            understandRequirement
                          }
                          className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 transition"
                        >
                          <Sparkles className="h-4 w-4" />
                          Understand Requirement
                        </button>

                        {requirementMessage && (
                          <div className="mt-3 rounded-xl bg-white border border-brand-100 px-4 py-3 text-sm text-brand-700">
                            {
                              requirementMessage
                            }
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-5">
                      <p className="text-sm font-semibold text-ink-700 mb-3">
                        Options
                      </p>

                      {tool.options?.map(
                        (option) => (
                          <OptionField
                            key={option.key}
                            opt={option}
                            value={
                              options[
                                option.key
                              ]
                            }
                            onChange={(value) =>
                              updateOption(
                                option.key,
                                value
                              )
                            }
                          />
                        )
                      )}
                    </div>

                    <button
                      onClick={() =>
                        void runConversion()
                      }
                      className="btn-primary w-full mt-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Run Conversion
                    </button>
                  </>
                )}

                {(needsText ||
                  needsOptionsOnly) &&
                  tool.options?.map(
                    (option) => (
                      <OptionField
                        key={option.key}
                        opt={option}
                        value={
                          options[
                            option.key
                          ]
                        }
                        onChange={(value) =>
                          updateOption(
                            option.key,
                            value
                          )
                        }
                      />
                    )
                  )}

                {(needsText ||
                  needsOptionsOnly) && (
                  <button
                    onClick={() =>
                      void runConversion()
                    }
                    className="btn-primary w-full mt-4"
                  >
                    <Sparkles className="h-4 w-4" />
                    Run{' '}
                    {needsOptionsOnly
                      ? 'Tool'
                      : 'Conversion'}
                  </button>
                )}
              </div>
            )}

            {/* WORKING */}

            {stage === 'working' && (
              <div className="p-8 sm:p-12 text-center">
                <div className="relative w-32 h-32 mx-auto">
                  <svg
                    className="w-32 h-32 -rotate-90"
                    viewBox="0 0 120 120"
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="#eceef2"
                      strokeWidth="8"
                    />

                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="#3478f6"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 52}`}
                      strokeDashoffset={`${
                        2 *
                        Math.PI *
                        52 *
                        (1 -
                          progress /
                            100)
                      }`}
                      className="transition-all duration-200"
                    />
                  </svg>

                  <div className="absolute inset-0 grid place-items-center">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                  </div>
                </div>

                <p className="mt-6 font-display text-lg font-semibold text-ink-900">
                  Converting…
                </p>

                <p className="text-sm text-ink-500 mt-1">
                  {Math.round(progress)}%
                  complete
                </p>
              </div>
            )}

            {/* DONE */}

            {stage === 'done' && (
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-accent-100 text-accent-600 grid place-items-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>

                  <div>
                    <p className="font-display text-lg font-bold text-ink-900">
                      Conversion Complete!
                    </p>

                    <p className="text-sm text-ink-500">
                      {results.length} file
                      {results.length >
                      1
                        ? 's'
                        : ''}{' '}
                      ready to
                      download
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {results.map(
                    (result, index) => (
                      <div
                        key={`${result.filename}-${index}`}
                        className="p-4 rounded-2xl bg-ink-50 border border-ink-100"
                      >
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileCheck2 className="w-5 h-5 text-brand-600 shrink-0" />

                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-ink-900 truncate">
                                {
                                  result.filename
                                }
                              </p>

                              <p className="text-xs text-ink-500">
                                {(
                                  result.blob
                                    .size /
                                  1024
                                ).toFixed(
                                  1
                                )}{' '}
                                KB ·{' '}
                                {
                                  result.mimeType
                                }
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              handleDownload(
                                result
                              )
                            }
                            className="btn-primary text-sm"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </button>

                          <button
                            onClick={() =>
                              handlePreview(
                                result
                              )
                            }
                            className="btn-secondary text-sm"
                          >
                            <Eye className="h-4 w-4" />
                            Preview
                          </button>

                          <button
                            onClick={() =>
                              handleShare(
                                result,
                                'email'
                              )
                            }
                            className="btn-ghost text-sm"
                          >
                            <Mail className="h-4 w-4" />
                            Email
                          </button>

                          <button
                            onClick={() =>
                              handleShare(
                                result,
                                'whatsapp'
                              )
                            }
                            className="btn-ghost text-sm"
                          >
                            <Share2 className="h-4 w-4" />
                            WhatsApp
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {results.length > 1 && (
                  <button
                    onClick={
                      handleDownloadAll
                    }
                    className="btn-secondary w-full mt-4"
                  >
                    <Download className="h-4 w-4" />
                    Download All
                  </button>
                )}

                {previewResult && (
                  <LivePreview
                    result={
                      previewResult
                    }
                    onClose={() =>
                      setPreviewResult(
                        null
                      )
                    }
                  />
                )}

                {results[0] &&
                  !results[0]
                    .preview &&
                  results[0].mimeType.startsWith(
                    'text/'
                  ) && (
                    <PreviewText
                      result={results[0]}
                    />
                  )}

                <button
                  onClick={reset}
                  className="btn-ghost w-full mt-4"
                >
                  <RefreshCw className="h-4 w-4" />
                  Convert Another
                </button>
              </div>
            )}

            {/* ERROR */}

            {stage === 'error' && (
              <div className="p-8 sm:p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-err-50 text-err-500 grid place-items-center mx-auto">
                  <AlertCircle className="w-8 h-8" />
                </div>

                <p className="mt-4 font-display text-lg font-bold text-ink-900">
                  Conversion Failed
                </p>

                <p className="text-sm text-err-600 mt-1 max-w-md mx-auto">
                  {error}
                </p>

                <button
                  onClick={reset}
                  className="btn-primary mt-6"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR */}

        <aside className="space-y-4">
          <div className="bg-white rounded-2xl border border-ink-200 p-5">
            <h3 className="font-display font-bold text-ink-900 mb-3 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-brand-600" />
              How it works
            </h3>

            <ol className="space-y-3">
              {(needsFile ||
                needsFileOptions) && (
                <>
                  <li className="flex gap-3 text-sm text-ink-600">
                    <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-xs font-bold shrink-0">
                      1
                    </span>

                    Upload your{' '}
                    {tool.inputType ===
                    'multi-file'
                      ? 'files'
                      : 'file'}
                  </li>

                  <li className="flex gap-3 text-sm text-ink-600">
                    <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-xs font-bold shrink-0">
                      2
                    </span>

                    {needsFileOptions
                      ? 'Set options and click Run'
                      : 'Conversion runs instantly in your browser'}
                  </li>
                </>
              )}

              {(needsText ||
                needsOptionsOnly) && (
                <>
                  <li className="flex gap-3 text-sm text-ink-600">
                    <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-xs font-bold shrink-0">
                      1
                    </span>

                    {needsText
                      ? 'Enter your input text or data'
                      : 'Set the tool options'}
                  </li>

                  <li className="flex gap-3 text-sm text-ink-600">
                    <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-xs font-bold shrink-0">
                      2
                    </span>

                    Click "
                    {needsOptionsOnly
                      ? 'Run Tool'
                      : 'Run Conversion'}
                    "
                  </li>
                </>
              )}

              <li className="flex gap-3 text-sm text-ink-600">
                <span className="w-6 h-6 rounded-full bg-accent-100 text-accent-700 grid place-items-center text-xs font-bold shrink-0">
                  3
                </span>

                Download, preview, or
                share your result
              </li>
            </ol>
          </div>

          <div className="bg-white rounded-2xl border border-ink-200 p-5">
            <h3 className="font-display font-bold text-ink-900 mb-3">
              Tool Info
            </h3>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">
                  Category
                </dt>

                <dd className="font-semibold text-ink-800 capitalize">
                  {tool.category}
                </dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-ink-500">
                  Output
                </dt>

                <dd className="font-semibold text-ink-800 uppercase">
                  {tool.outputFormat}
                </dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-ink-500">
                  Input
                </dt>

                <dd className="font-semibold text-ink-800 capitalize">
                  {tool.inputType}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-gradient-to-br from-brand-50 to-accent-50 rounded-2xl border border-brand-100 p-5">
            <div className="flex items-center gap-2 text-brand-700 mb-2">
              <ShieldCheck className="w-4 h-4" />

              <span className="text-sm font-bold">
                Privacy Guaranteed
              </span>
            </div>

            <p className="text-xs text-ink-600">
              Browser-safe tools run locally.
              Office and other server-backed
              tools upload files only to the
              configured QuadraConverter
              conversion service.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-ink-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-warn-500 fill-warn-500" />

              <span className="text-sm font-bold text-ink-900">
                Popular Tool
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-ink-500">
              <Clock className="w-3.5 h-3.5" />
              Instant results
            </div>
          </div>
        </aside>
      </div>

      {/* EMAIL DIALOG */}

      {emailResult && (
        <EmailShareDialog
          result={emailResult}
          toolName={tool.name}
          email={emailAddress}
          setEmail={setEmailAddress}
          sending={emailSending}
          status={emailStatus}
          onClose={() => {
            if (!emailSending) {
              setEmailResult(null);
              setEmailStatus(null);
            }
          }}
          onSend={async () => {
            if (!emailAddress.trim()) {
              setEmailStatus(
                'Please enter an email address.'
              );
              return;
            }

            setEmailSending(true);
            setEmailStatus(null);

            try {
              const apiUrl =
                import.meta.env
                  .VITE_CONVERTER_API_URL;

              if (!apiUrl) {
                throw new Error(
                  'Email service is not configured.'
                );
              }

              const formData =
                new FormData();

              formData.append(
                'file',
                emailResult.blob,
                emailResult.filename
              );

              formData.append(
                'to',
                emailAddress.trim()
              );

              formData.append(
                'subject',
                `Converted file: ${emailResult.filename}`
              );

              formData.append(
                'tool',
                tool.name
              );

              const response =
                await fetch(
                  `${apiUrl}/send-email`,
                  {
                    method: 'POST',
                    body: formData,
                  }
                );

              let data: {
                detail?: string;
                message?: string;
              } = {};

              try {
                data =
                  await response.json();
              } catch {
                // Response wasn't JSON.
              }

              if (!response.ok) {
                throw new Error(
                  data.detail ||
                    data.message ||
                    'Email could not be sent.'
                );
              }

              setEmailStatus(
                'Email sent successfully.'
              );
            } catch (err) {
              setEmailStatus(
                err instanceof Error
                  ? err.message
                  : 'Email could not be sent.'
              );
            } finally {
              setEmailSending(false);
            }
          }}
        />
      )}
    </div>
  );
}

/*
 * ============================================================
 * PREVIEW TEXT
 * ============================================================
 */

function PreviewText({
  result,
}: {
  result: Converters.ConvertResult;
}) {
  const [text, setText] =
    useState<string>('');

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let active = true;

    result.blob
      .text()
      .then((value) => {
        if (!active) return;

        setText(value);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;

        setText(
          'Unable to preview this file.'
        );

        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [result]);

  return (
    <div className="mt-6 p-4 rounded-2xl bg-white border border-ink-200">
      <p className="text-sm font-semibold text-ink-700 mb-2 flex items-center gap-2">
        <Eye className="h-4 w-4" />
        Preview
      </p>

      {loading ? (
        <p className="text-sm text-ink-400">
          Loading…
        </p>
      ) : (
        <pre className="text-xs text-ink-700 max-h-64 overflow-auto whitespace-pre-wrap font-mono bg-ink-50 p-3 rounded-xl">
          {text.substring(0, 5000)}
          {text.length > 5000
            ? '\n\n… (truncated)'
            : ''}
        </pre>
      )}
    </div>
  );
}

/*
 * ============================================================
 * OPTION FIELD
 * ============================================================
 */

function OptionField({
  opt,
  value,
  onChange,
}: {
  opt: ToolOption;
  value: string | number | boolean;
  onChange: (
    value: string | number | boolean
  ) => void;
}) {
  if (opt.type === 'text') {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-ink-700 mb-1.5">
          {opt.label}
        </label>

        <textarea
          value={String(value || '')}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={opt.placeholder}
          rows={6}
          className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm text-ink-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition resize-y font-mono"
        />
      </div>
    );
  }

  if (opt.type === 'select') {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-ink-700 mb-1.5">
          {opt.label}
        </label>

        <select
          value={String(value)}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm text-ink-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition bg-white"
        >
          {opt.choices?.map(
            (choice) => (
              <option
                key={choice.value}
                value={choice.value}
              >
                {choice.label}
              </option>
            )
          )}
        </select>
      </div>
    );
  }

  if (opt.type === 'number') {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-ink-700 mb-1.5">
          {opt.label}
        </label>

        <input
          type="number"
          value={Number(value)}
          onChange={(event) =>
            onChange(
              Number(event.target.value)
            )
          }
          min={opt.min}
          max={opt.max}
          step={opt.step}
          placeholder={opt.placeholder}
          className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm text-ink-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition"
        />
      </div>
    );
  }

  if (opt.type === 'range') {
    return (
      <div className="mb-4">
        <label className="flex justify-between text-sm font-medium text-ink-700 mb-1.5">
          <span>{opt.label}</span>

          <span className="text-brand-600 font-bold">
            {value}%
          </span>
        </label>

        <input
          type="range"
          value={Number(value)}
          onChange={(event) =>
            onChange(
              Number(event.target.value)
            )
          }
          min={opt.min}
          max={opt.max}
          step={opt.step}
          className="w-full accent-brand-600"
        />
      </div>
    );
  }

  if (opt.type === 'checkbox') {
    return (
      <label className="flex items-center gap-3 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) =>
            onChange(
              event.target.checked
            )
          }
          className="w-5 h-5 rounded accent-brand-600"
        />

        <span className="text-sm font-medium text-ink-700">
          {opt.label}
        </span>
      </label>
    );
  }

  return null;
}

/*
 * ============================================================
 * LIVE PREVIEW
 * ============================================================
 */

function LivePreview({
  result,
  onClose,
}: {
  result: Converters.ConvertResult;
  onClose: () => void;
}) {
  const [url, setUrl] =
    useState<string>('');

  useEffect(() => {
    const objectUrl =
      URL.createObjectURL(
        result.blob
      );

    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(
        objectUrl
      );
    };
  }, [result]);

  const mime =
    result.mimeType.toLowerCase();

  const isImage =
    mime.startsWith('image/');

  const isPdf =
    mime === 'application/pdf';

  const isText =
    mime.startsWith('text/') ||
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('xml');

  return (
    <div className="mt-6 rounded-2xl border border-ink-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-ink-100">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-brand-600" />

          <div>
            <p className="text-sm font-bold text-ink-900">
              Live Preview
            </p>

            <p className="text-xs text-ink-500 truncate max-w-[280px]">
              {result.filename}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-ink-500 hover:text-ink-900"
        >
          Close
        </button>
      </div>

      <div className="p-4 bg-ink-50">
        {!url && (
          <div className="h-64 grid place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          </div>
        )}

        {url && isImage && (
          <div className="min-h-[300px] max-h-[650px] flex items-center justify-center overflow-auto rounded-xl bg-white p-4">
            <img
              src={url}
              alt={result.filename}
              className="max-w-full max-h-[600px] object-contain rounded-lg"
            />
          </div>
        )}

        {url && isPdf && (
          <iframe
            src={url}
            title={`Preview ${result.filename}`}
            className="w-full h-[650px] rounded-xl border border-ink-200 bg-white"
          />
        )}

        {url && isText && (
          <TextBlobPreview
            result={result}
          />
        )}

        {url &&
          !isImage &&
          !isPdf &&
          !isText && (
            <div className="rounded-xl bg-white p-8 text-center">
              <FileCheck2 className="h-10 w-10 mx-auto text-brand-600" />

              <p className="mt-3 text-sm font-semibold text-ink-900">
                Preview not available
                for this file type
              </p>

              <button
                onClick={() =>
                  Converters.downloadBlob(
                    result.blob,
                    result.filename
                  )
                }
                className="btn-primary mt-4"
              >
                <Download className="h-4 w-4" />
                Download File
              </button>
            </div>
          )}
      </div>
    </div>
  );
}

/*
 * ============================================================
 * TEXT BLOB PREVIEW
 * ============================================================
 */

function TextBlobPreview({
  result,
}: {
  result: Converters.ConvertResult;
}) {
  const [text, setText] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let active = true;

    result.blob
      .text()
      .then((value) => {
        if (!active) return;

        setText(value);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;

        setText(
          'Unable to preview this file.'
        );

        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [result]);

  if (loading) {
    return (
      <div className="h-64 grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <pre className="bg-white rounded-xl border border-ink-200 p-4 max-h-[600px] overflow-auto text-xs text-ink-700 whitespace-pre-wrap font-mono">
      {text.length > 20000
        ? `${text.substring(
            0,
            20000
          )}\n\n... Preview truncated`
        : text}
    </pre>
  );
}

/*
 * ============================================================
 * EMAIL SHARE DIALOG
 * ============================================================
 */

function EmailShareDialog({
  result,
  toolName,
  email,
  setEmail,
  sending,
  status,
  onClose,
  onSend,
}: {
  result: Converters.ConvertResult;
  toolName: string;
  email: string;
  setEmail: (value: string) => void;
  sending: boolean;
  status: string | null;
  onClose: () => void;
  onSend: () => void;
}) {
  const success =
    status ===
    'Email sent successfully.';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-ink-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-ink-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-ink-900">
                Email Converted File
              </h2>

              <p className="text-xs text-ink-500 mt-1">
                Send the converted file
                directly to an email
                address.
              </p>
            </div>

            <button
              onClick={onClose}
              disabled={sending}
              className="text-ink-400 hover:text-ink-900 text-lg"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="rounded-xl bg-ink-50 border border-ink-100 p-3 mb-4">
            <p className="text-sm font-semibold text-ink-900 truncate">
              {result.filename}
            </p>

            <p className="text-xs text-ink-500 mt-1">
              {(
                result.blob.size /
                1024
              ).toFixed(1)}{' '}
              KB · {toolName}
            </p>
          </div>

          <label className="block text-sm font-semibold text-ink-700 mb-2">
            Recipient Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            placeholder="recipient@example.com"
            disabled={
              sending || success
            }
            className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-ink-50"
          />

          {status && (
            <div
              className={`
                mt-3 rounded-xl px-4 py-3 text-sm
                ${
                  success
                    ? 'bg-accent-50 text-accent-700'
                    : 'bg-err-50 text-err-600'
                }
              `}
            >
              {status}
            </div>
          )}

          {!success && (
            <button
              onClick={onSend}
              disabled={sending}
              className="btn-primary w-full mt-5"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send Email
                </>
              )}
            </button>
          )}

          {success && (
            <button
              onClick={onClose}
              className="btn-primary w-full mt-5"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
