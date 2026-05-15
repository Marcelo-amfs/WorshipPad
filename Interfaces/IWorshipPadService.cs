namespace WorshipPad.Interfaces
{
    public interface IWorshipPadService
    {
        (bool IsValid, string NormalizedKey) NormalizeAndValidateKey(string key);
        string GetAudioFilePath(string key);
        bool FileExists(string key);
    }
}
