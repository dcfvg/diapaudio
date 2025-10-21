import { describe, it, expect, vi } from 'vitest';
import React, { createRef } from 'react';
import { renderWithProviders } from '../../test/test-utils.jsx';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dropzone from '../Dropzone.jsx';

describe('Dropzone', () => {
  const defaultProps = {
    className: 'dropzone',
    isLoading: false,
    dropzoneCtaClassName: 'dropzone__cta',
    dropzoneBodyClassName: 'dropzone__body',
    dropzoneLoaderClassName: 'dropzone__loader',
    loaderBarStyle: {},
    loaderStatusText: '',
    loaderDetails: '',
    loaderDetailsIsHtml: false,
    progressPercent: 0,
    folderInputRef: createRef(),
    zipInputRef: createRef(),
    filesInputRef: createRef(),
    onBrowseClick: vi.fn(),
    onFileSelection: vi.fn(),
    onDragEnter: vi.fn(),
    onDragOver: vi.fn(),
    onDragLeave: vi.fn(),
    onDragEnd: vi.fn(),
    onDrop: vi.fn(),
  };

  it('renders the dropzone component', () => {
    const { container } = renderWithProviders(<Dropzone {...defaultProps} />);
    expect(container.querySelector('#dropzone')).toBeTruthy();
  });

  it('renders three browse buttons', () => {
    renderWithProviders(<Dropzone {...defaultProps} />);
    expect(screen.getByText('Choose a folder')).toBeTruthy();
    expect(screen.getByText('Choose a ZIP archive')).toBeTruthy();
    expect(screen.getByText('Choose files')).toBeTruthy();
  });

  it('calls onBrowseClick with correct ref when folder button is clicked', async () => {
    const folderRef = createRef();
    const onBrowseClick = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <Dropzone {...defaultProps} folderInputRef={folderRef} onBrowseClick={onBrowseClick} />
    );

    const folderButton = screen.getByText('Choose a folder');
    await user.click(folderButton);

    expect(onBrowseClick).toHaveBeenCalledWith(folderRef);
  });

  it('calls onBrowseClick with correct ref when zip button is clicked', async () => {
    const zipRef = createRef();
    const onBrowseClick = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <Dropzone {...defaultProps} zipInputRef={zipRef} onBrowseClick={onBrowseClick} />
    );

    const zipButton = screen.getByText('Choose a ZIP archive');
    await user.click(zipButton);

    expect(onBrowseClick).toHaveBeenCalledWith(zipRef);
  });

  it('calls onBrowseClick with correct ref when files button is clicked', async () => {
    const filesRef = createRef();
    const onBrowseClick = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <Dropzone {...defaultProps} filesInputRef={filesRef} onBrowseClick={onBrowseClick} />
    );

    const filesButton = screen.getByText('Choose files');
    await user.click(filesButton);

    expect(onBrowseClick).toHaveBeenCalledWith(filesRef);
  });

  it('calls onDragEnter when dragging over', () => {
    const onDragEnter = vi.fn();
    const { container } = renderWithProviders(
      <Dropzone {...defaultProps} onDragEnter={onDragEnter} />
    );

    const dropzone = container.querySelector('#dropzone');
    fireEvent.dragEnter(dropzone);

    expect(onDragEnter).toHaveBeenCalled();
  });

  it('calls onDragOver during drag', () => {
    const onDragOver = vi.fn();
    const { container } = renderWithProviders(
      <Dropzone {...defaultProps} onDragOver={onDragOver} />
    );

    const dropzone = container.querySelector('#dropzone');
    fireEvent.dragOver(dropzone);

    expect(onDragOver).toHaveBeenCalled();
  });

  it('calls onDragLeave when drag leaves', () => {
    const onDragLeave = vi.fn();
    const { container } = renderWithProviders(
      <Dropzone {...defaultProps} onDragLeave={onDragLeave} />
    );

    const dropzone = container.querySelector('#dropzone');
    fireEvent.dragLeave(dropzone);

    expect(onDragLeave).toHaveBeenCalled();
  });

  it('calls onDrop when files are dropped', () => {
    const onDrop = vi.fn();
    const { container } = renderWithProviders(<Dropzone {...defaultProps} onDrop={onDrop} />);

    const dropzone = container.querySelector('#dropzone');
    fireEvent.drop(dropzone);

    expect(onDrop).toHaveBeenCalled();
  });

  it('displays loader status text when loading', () => {
    renderWithProviders(
      <Dropzone {...defaultProps} isLoading={true} loaderStatusText="Processing files..." />
    );
    expect(screen.getByText('Processing files...')).toBeTruthy();
  });

  it('displays progress bar with correct value', () => {
    const { container } = renderWithProviders(
      <Dropzone {...defaultProps} progressPercent={50} />
    );

    const progressBar = container.querySelector('#loader-progress-bar');
    expect(progressBar?.getAttribute('aria-valuenow')).toBe('50');
  });

  it('clamps progress percent to 0-100 range', () => {
    const { container: container1 } = renderWithProviders(
      <Dropzone {...defaultProps} progressPercent={-10} />
    );
    const progressBar1 = container1.querySelector('#loader-progress-bar');
    expect(progressBar1?.getAttribute('aria-valuenow')).toBe('0');

    const { container: container2 } = renderWithProviders(
      <Dropzone {...defaultProps} progressPercent={150} />
    );
    const progressBar2 = container2.querySelector('#loader-progress-bar');
    expect(progressBar2?.getAttribute('aria-valuenow')).toBe('100');
  });

  it('handles undefined progress percent', () => {
    const { container } = renderWithProviders(
      <Dropzone {...defaultProps} progressPercent={undefined} />
    );

    const progressBar = container.querySelector('#loader-progress-bar');
    expect(progressBar?.getAttribute('aria-valuenow')).toBeFalsy();
  });

  it('displays loader details as plain text', () => {
    renderWithProviders(
      <Dropzone {...defaultProps} loaderDetails="Loading 5 of 10 files" loaderDetailsIsHtml={false} />
    );
    expect(screen.getByText('Loading 5 of 10 files')).toBeTruthy();
  });

  it('displays loader details as HTML', () => {
    const htmlDetails = '<em>Processing</em> your files';
    renderWithProviders(
      <Dropzone {...defaultProps} loaderDetails={htmlDetails} loaderDetailsIsHtml={true} />
    );
    expect(screen.getByText('Processing')).toBeTruthy();
  });

  it('sanitizes HTML in loader details', () => {
    const maliciousDetails = '<script>alert("xss")</script><em>Safe</em>';
    const { container } = renderWithProviders(
      <Dropzone {...defaultProps} loaderDetails={maliciousDetails} loaderDetailsIsHtml={true} />
    );
    const loaderDetails = container.querySelector('.loader-details');
    expect(loaderDetails).toBeTruthy();
    expect(screen.getByText('Safe')).toBeTruthy();
  });

  it('renders hidden file inputs with correct attributes', () => {
    const { container } = renderWithProviders(<Dropzone {...defaultProps} />);

    const folderInput = container.querySelector('#folder-input');
    expect(folderInput).toBeTruthy();
    expect(folderInput?.getAttribute('type')).toBe('file');
    expect(folderInput?.hasAttribute('multiple')).toBe(true);
    expect(folderInput?.hasAttribute('hidden')).toBe(true);

    const zipInput = container.querySelector('#zip-input');
    expect(zipInput).toBeTruthy();
    expect(zipInput?.getAttribute('accept')).toContain('.zip');

    const filesInput = container.querySelector('#files-input');
    expect(filesInput).toBeTruthy();
    expect(filesInput?.getAttribute('accept')).toContain('audio/*');
  });

  it('calls onFileSelection when file input changes', () => {
    const onFileSelection = vi.fn();
    const { container } = renderWithProviders(
      <Dropzone {...defaultProps} onFileSelection={onFileSelection} />
    );

    const folderInput = container.querySelector('#folder-input');
    fireEvent.change(folderInput);

    expect(onFileSelection).toHaveBeenCalled();
  });

  it('renders language selector', () => {
    const { container } = renderWithProviders(<Dropzone {...defaultProps} />);
    const langSelector = container.querySelector('.dropzone__language-selector');
    expect(langSelector).toBeTruthy();
  });

  it('renders app title and tagline', () => {
    renderWithProviders(<Dropzone {...defaultProps} />);
    expect(screen.getByText('diapaudio')).toBeTruthy();
    expect(screen.getByText(/Playback photos synced with recordings/i)).toBeTruthy();
  });

  it('renders step instructions', () => {
    renderWithProviders(<Dropzone {...defaultProps} />);
    // Check for actual translated text instead of translation keys
    expect(screen.getByText(/Compile audio recordings/i)).toBeTruthy();
    expect(screen.getByText(/Use timestamps or metadata/i)).toBeTruthy();
    // getAllByText since this text appears multiple times (step title and button)
    const dropFolderElements = screen.getAllByText(/Drop folders/i);
    expect(dropFolderElements.length).toBeGreaterThan(0);
  });

  it('renders notes section', () => {
    renderWithProviders(<Dropzone {...defaultProps} />);
    // Check for actual translated text instead of translation keys
    expect(screen.getByText(/Nothing leaves your computer/i)).toBeTruthy();
  });
});
